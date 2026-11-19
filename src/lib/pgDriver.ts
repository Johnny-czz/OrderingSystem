import type { Dish, Favorite, MealRound, Member, Order, Settings, Wish } from "@/types";
import type { DataDriver } from "./driver";
import { getRealtime, getRdb, isPgMode } from "./cloudbase";
import { buildDefaultSettings, makeMember } from "./auth";
import { todayKey, uid } from "./utils";
import seedDishes from "../../db/seed/dishes.json";

/**
 * CloudBase PostgreSQL 模式驱动：
 * 用 JS SDK v3 的 rdb()（PostgREST，Supabase 同款链式语法）+ realtime() 的 Postgres CDC 实现实时同步。
 */

const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let channelRef: any = null;
let realtimeRef: any = null;
let realtimeStarted = false;

function emit() {
  listeners.forEach((l) => l());
}

async function table(name: string) {
  const rdb = await getRdb();
  return rdb.from(name);
}

async function unwrap<T>(promise: any): Promise<T[]> {
  const res = await promise;
  if (res?.error) {
    console.error("CloudBase PG 查询失败", res.error);
    return [];
  }
  return (res?.data ?? []) as T[];
}

/* ---------- 行 ↔ 对象 映射 ---------- */

type RowDish = {
  id: string;
  name: string;
  category: string;
  description: string;
  cover_url: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  spicy_level: number;
  available: boolean;
  sort: number;
  source: string;
  created_at: number;
};

const toDish = (r: RowDish): Dish => ({
  _id: r.id,
  name: r.name,
  category: (r.category ?? "荤菜") as Dish["category"],
  desc: r.description ?? "",
  coverUrl: r.cover_url ?? "",
  ingredients: r.ingredients ?? [],
  steps: r.steps ?? [],
  tags: r.tags ?? [],
  spicyLevel: (r.spicy_level ?? 0) as Dish["spicyLevel"],
  available: r.available ?? true,
  sort: r.sort ?? 0,
  source: r.source ?? "",
  createdAt: Number(r.created_at ?? 0),
});

const dishRow = (d: Dish) => ({
  id: d._id ?? uid("d"),
  name: d.name,
  category: d.category,
  description: d.desc ?? "",
  cover_url: d.coverUrl ?? "",
  ingredients: d.ingredients ?? [],
  steps: d.steps ?? [],
  tags: d.tags ?? [],
  spicy_level: d.spicyLevel ?? 0,
  available: d.available ?? true,
  sort: d.sort ?? 0,
  source: d.source ?? "",
  created_at: d.createdAt ?? Date.now(),
});

const toMember = (r: any): Member => ({
  _id: r.id,
  name: r.name,
  role: (r.role ?? "member") as Member["role"],
  username: r.username ?? undefined,
  passwordSalt: r.password_salt ?? undefined,
  passwordHash: r.password_hash ?? undefined,
  color: r.color ?? "",
  active: r.active ?? true,
  createdAt: Number(r.created_at ?? 0),
});

const memberRow = (m: Member) => ({
  id: m._id ?? uid("m"),
  name: m.name,
  role: m.role ?? "member",
  username: m.username ?? null,
  password_salt: m.passwordSalt ?? null,
  password_hash: m.passwordHash ?? null,
  color: m.color ?? "",
  active: m.active ?? true,
  created_at: m.createdAt ?? Date.now(),
});

const toRound = (r: any): MealRound => ({
  _id: r.id,
  date: r.date ?? "",
  title: r.title ?? "今日餐桌",
  status: (r.status ?? "open") as MealRound["status"],
  createdBy: r.created_by ?? "",
  createdAt: Number(r.created_at ?? 0),
  closedAt: r.closed_at ? Number(r.closed_at) : undefined,
});

const roundRow = (r: MealRound) => ({
  id: r._id ?? uid("r"),
  date: r.date,
  title: r.title,
  status: r.status,
  created_by: r.createdBy ?? "",
  created_at: r.createdAt ?? Date.now(),
  closed_at: r.closedAt ?? null,
});

const toOrder = (r: any): Order => ({
  _id: r.id,
  roundId: r.round_id ?? "",
  memberId: r.member_id ?? "",
  memberName: r.member_name ?? "",
  dishId: r.dish_id ?? "",
  dishName: r.dish_name ?? "",
  qty: Number(r.qty ?? 1),
  note: r.note ?? "",
  status: (r.status ?? "pending") as Order["status"],
  createdAt: Number(r.created_at ?? 0),
});

const orderRow = (o: Order) => ({
  id: o._id ?? uid("o"),
  round_id: o.roundId,
  member_id: o.memberId,
  member_name: o.memberName,
  dish_id: o.dishId,
  dish_name: o.dishName,
  qty: o.qty ?? 1,
  note: o.note ?? "",
  status: o.status ?? "pending",
  created_at: o.createdAt ?? Date.now(),
});

const toWish = (r: any): Wish => ({
  _id: r.id,
  name: r.name,
  reason: r.reason ?? "",
  proposedBy: r.proposed_by ?? "",
  votes: r.votes ?? [],
  status: (r.status ?? "pending") as Wish["status"],
  createdAt: Number(r.created_at ?? 0),
});

const wishRow = (w: Wish) => ({
  id: w._id ?? uid("w"),
  name: w.name,
  reason: w.reason ?? "",
  proposed_by: w.proposedBy ?? "",
  votes: w.votes ?? [],
  status: w.status ?? "pending",
  created_at: w.createdAt ?? Date.now(),
});

const toFavorite = (r: any): Favorite => ({
  _id: r.id,
  memberId: r.member_id ?? "",
  dishId: r.dish_id ?? "",
  createdAt: Number(r.created_at ?? 0),
});

const favoriteRow = (f: Favorite) => ({
  id: f._id ?? uid("fav"),
  member_id: f.memberId,
  dish_id: f.dishId,
  created_at: f.createdAt ?? Date.now(),
});

const SETTINGS_ID = "default";

/* ---------- 初始化与实时订阅 ---------- */

async function ensureSettings(): Promise<Settings> {
  const t = await table("settings");
  const rows = await unwrap<any>(t.select("*").eq("id", SETTINGS_ID).limit(1));
  if (rows.length) {
    const r = rows[0];
    return {
      _id: r.id,
      familyName: r.family_name ?? "我家餐桌",
      notice: r.notice ?? "",
      authMode: (r.auth_mode ?? "guest") as Settings["authMode"],
      adminUsername: r.admin_username ?? "admin",
      adminSalt: r.admin_salt ?? "",
      adminPasswordHash: r.admin_password_hash ?? "",
      adminMustChangePassword: r.admin_must_change_password ?? false,
    };
  }
  const fresh = await buildDefaultSettings();
  await t.insert({
    id: SETTINGS_ID,
    family_name: fresh.familyName,
    notice: fresh.notice,
    auth_mode: fresh.authMode,
    admin_username: fresh.adminUsername,
    admin_salt: fresh.adminSalt,
    admin_password_hash: fresh.adminPasswordHash,
    admin_must_change_password: fresh.adminMustChangePassword,
  });
  const admin = makeMember("我（管理员）", "admin");
  admin._id = uid("m");
  admin.username = fresh.adminUsername;
  await (await table("members")).insert(memberRow(admin));
  await (await table("rounds")).insert(
    roundRow({
      date: todayKey(),
      title: "今日餐桌",
      status: "open",
      createdBy: admin._id,
      createdAt: Date.now(),
    }),
  );
  return { ...fresh, _id: SETTINGS_ID };
}

async function ensureDishes() {
  const t = await table("dishes");
  const rows = await unwrap<any>(t.select("id").limit(1));
  if (rows.length) return;
  const list = (seedDishes as Omit<Dish, "_id" | "createdAt">[]).map((d, i) =>
    dishRow({
      ...d,
      coverUrl: d.coverUrl ?? "",
      source: d.source ?? "",
      available: true,
      sort: i,
      createdAt: Date.now() - (70 - i) * 1000,
    } as Dish),
  );
  for (let i = 0; i < list.length; i += 20) {
    await t.insert(list.slice(i, i + 20));
  }
}

function onVisible() {
  if (typeof document !== "undefined" && document.visibilityState === "visible") emit();
}

/** 实时通道不可用时的兜底：3 秒轮询 + 切回页面立即拉一次 */
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(emit, 3000);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisible);
  }
}

async function startRealtime() {
  if (realtimeStarted || pollTimer) return;
  realtimeStarted = true;
  try {
    realtimeRef = await getRealtime();
    const channel = realtimeRef.channel("family-table");
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => emit(),
    );
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rounds" },
      () => emit(),
    );
    channel.subscribe((status: string, err: unknown) => {
      if (status === "SUBSCRIBED") {
        channelRef = channel;
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("orders 实时订阅失败，降级为轮询", status, err);
        channelRef = null;
        startPolling();
      }
    });
  } catch (error) {
    console.error("实时订阅不可用，使用轮询同步", error);
    startPolling();
  }
}

export const pgDriver: DataDriver = {
  name: "cloud",

  async init() {
    if (!isPgMode()) throw new Error("未启用 PG 模式（VITE_TCB_MODE=pg）");
    await ensureSettings();
    await ensureDishes();
    void startRealtime();
  },

  async listDishes() {
    const t = await table("dishes");
    const rows = await unwrap<RowDish>(t.select("*").order("sort", { ascending: true }).limit(500));
    return rows.map(toDish);
  },

  async upsertDish(dish) {
    const t = await table("dishes");
    await t.upsert(dishRow(dish));
  },

  async removeDish(id) {
    const t = await table("dishes");
    await t.delete().eq("id", id);
  },

  async getSettings() {
    return ensureSettings();
  },

  async updateSettings(patch) {
    const t = await table("settings");
    const row: Record<string, unknown> = { id: SETTINGS_ID };
    if (patch.familyName !== undefined) row.family_name = patch.familyName;
    if (patch.notice !== undefined) row.notice = patch.notice;
    if (patch.authMode !== undefined) row.auth_mode = patch.authMode;
    if (patch.adminUsername !== undefined) row.admin_username = patch.adminUsername;
    if (patch.adminSalt !== undefined) row.admin_salt = patch.adminSalt;
    if (patch.adminPasswordHash !== undefined) row.admin_password_hash = patch.adminPasswordHash;
    if (patch.adminMustChangePassword !== undefined)
      row.admin_must_change_password = patch.adminMustChangePassword;
    await t.upsert(row);
  },

  async listMembers() {
    const t = await table("members");
    const rows = await unwrap<any>(t.select("*").order("created_at", { ascending: true }).limit(200));
    return rows.map(toMember);
  },

  async upsertMember(member) {
    const t = await table("members");
    await t.upsert(memberRow(member));
  },

  async removeMember(id) {
    const t = await table("members");
    await t.delete().eq("id", id);
  },

  async getOpenRound() {
    const t = await table("rounds");
    const rows = await unwrap<any>(t.select("*").eq("status", "open").order("created_at", { ascending: false }).limit(1));
    return rows.length ? toRound(rows[0]) : null;
  },

  async createRound(round) {
    const t = await table("rounds");
    const open = await this.getOpenRound();
    if (open?._id) await t.update({ status: "closed" }).eq("id", open._id);
    const row = roundRow(round);
    await t.insert(row);
    return { ...round, _id: row.id };
  },

  async updateRound(id, patch) {
    const t = await table("rounds");
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.closedAt !== undefined) row.closed_at = patch.closedAt;
    await t.update(row).eq("id", id);
  },

  async listRounds(limit = 30) {
    const t = await table("rounds");
    const rows = await unwrap<any>(t.select("*").order("created_at", { ascending: false }).limit(limit));
    return rows.map(toRound);
  },

  async listOrders(roundId) {
    const t = await table("orders");
    const rows = await unwrap<any>(t.select("*").eq("round_id", roundId).order("created_at", { ascending: true }).limit(200));
    return rows.map(toOrder);
  },

  async listAllOrders(limit = 300) {
    const t = await table("orders");
    const rows = await unwrap<any>(t.select("*").order("created_at", { ascending: false }).limit(limit));
    return rows.map(toOrder);
  },

  async addOrder(order) {
    const t = await table("orders");
    await t.insert(orderRow(order));
  },

  async updateOrder(id, patch) {
    const t = await table("orders");
    const row: Record<string, unknown> = {};
    if (patch.qty !== undefined) row.qty = patch.qty;
    if (patch.note !== undefined) row.note = patch.note;
    if (patch.status !== undefined) row.status = patch.status;
    await t.update(row).eq("id", id);
  },

  async removeOrder(id) {
    const t = await table("orders");
    await t.delete().eq("id", id);
  },

  async listWishes() {
    const t = await table("wishes");
    const rows = await unwrap<any>(t.select("*").order("created_at", { ascending: false }).limit(200));
    return rows.map(toWish);
  },

  async addWish(wish) {
    const t = await table("wishes");
    await t.insert(wishRow(wish));
  },

  async updateWish(id, patch) {
    const t = await table("wishes");
    const row: Record<string, unknown> = {};
    if (patch.votes !== undefined) row.votes = patch.votes;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.reason !== undefined) row.reason = patch.reason;
    await t.update(row).eq("id", id);
  },

  async removeWish(id) {
    const t = await table("wishes");
    await t.delete().eq("id", id);
  },

  async listFavorites(memberId) {
    const t = await table("favorites");
    const rows = await unwrap<any>(
      t.select("*").eq("member_id", memberId).order("created_at", { ascending: false }).limit(500),
    );
    return rows.map(toFavorite);
  },

  async addFavorite(fav) {
    const t = await table("favorites");
    await t.upsert(favoriteRow(fav));
  },

  async removeFavorite(memberId, dishId) {
    const t = await table("favorites");
    await t.delete().eq("member_id", memberId).eq("dish_id", dishId);
  },

  subscribe(listener) {
    listeners.add(listener);
    void startRealtime();
    return () => {
      listeners.delete(listener);
    };
  },
};
