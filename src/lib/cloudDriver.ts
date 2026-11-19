import type { Dish, Favorite, MealRound, Member, Order, Settings, Wish } from "@/types";
import type { DataDriver } from "./driver";
import { getCloudDb, isCloudEnabled } from "./cloudbase";
import { buildDefaultSettings, makeMember } from "./auth";
import { todayKey, uid } from "./utils";
import seedDishes from "../../db/seed/dishes.json";

const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let watcher: { close: () => void } | null = null;

function emit() {
  listeners.forEach((l) => l());
}

async function col(name: string) {
  const db = await getCloudDb();
  return db.collection(name);
}

async function fetchAll<T>(name: string, limit = 200): Promise<T[]> {
  const c = await col(name);
  const res = await c.limit(Math.min(limit, 100)).get();
  return ((res?.data ?? []) as T[]).map((x: any) => ({ ...x, _id: x._id ?? x.id }));
}

async function startRealtime() {
  if (watcher || pollTimer) return;
  const db = await getCloudDb();
  try {
    watcher = db.collection("orders").watch({
      onChange: () => emit(),
      onError: (err: unknown) => {
        console.error("orders 实时订阅出错，降级为轮询", err);
        watcher = null;
        if (!pollTimer) pollTimer = setInterval(emit, 5000);
      },
    });
  } catch (error) {
    console.error("实时推送不可用，使用轮询同步", error);
    if (!pollTimer) pollTimer = setInterval(emit, 5000);
  }
}

async function ensureSettings(): Promise<Settings> {
  const c = await col("settings");
  const res = await c.limit(1).get();
  const existing = res?.data?.[0];
  if (existing) {
    const s = { ...existing, _id: existing._id ?? existing.id } as Settings;
    if (!s.adminSalt) {
      const fresh = await buildDefaultSettings();
      await c.doc(s._id as string).update({ ...fresh, _id: undefined } as any);
      return { ...fresh, _id: s._id };
    }
    return s;
  }
  const fresh = await buildDefaultSettings();
  const added = await c.add({ ...fresh, _id: undefined } as any);
  const id = (added as any)?.id ?? (added as any)?._id;
  const admin = makeMember("我（管理员）", "admin");
  admin._id = uid("m");
  admin.username = fresh.adminUsername;
  const mc = await col("members");
  await mc.add({ ...admin, _id: undefined } as any);
  await (await col("rounds")).add({
    date: todayKey(),
    title: "今日餐桌",
    status: "open",
    createdBy: admin._id,
    createdAt: Date.now(),
  } as any);
  return { ...fresh, _id: id };
}

async function ensureDishes() {
  const c = await col("dishes");
  const res = await c.limit(1).get();
  if ((res?.data ?? []).length > 0) return;
  const list = (seedDishes as Omit<Dish, "_id" | "createdAt">[]).map((d, i) => ({
    ...d,
    coverUrl: d.coverUrl ?? "",
    source: d.source ?? "",
    available: true,
    sort: i,
    createdAt: Date.now() - (70 - i) * 1000,
  }));
  for (let i = 0; i < list.length; i += 20) {
    await Promise.all(list.slice(i, i + 20).map((d) => c.add(d as any)));
  }
}

export const cloudDriver: DataDriver = {
  name: "cloud",

  async init() {
    if (!isCloudEnabled()) throw new Error("未配置 VITE_TCB_ENV_ID");
    await ensureSettings();
    await ensureDishes();
    void startRealtime();
  },

  async listDishes() {
    const list = await fetchAll<Dish>("dishes");
    return list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  },

  async upsertDish(dish) {
    const c = await col("dishes");
    if (dish._id) {
      const payload = { ...dish } as any;
      delete payload._id;
      await c.doc(dish._id).update(payload);
      return;
    }
    const payload = { ...dish } as any;
    delete payload._id;
    await c.add(payload);
  },

  async removeDish(id) {
    const c = await col("dishes");
    await c.doc(id).remove();
  },

  async getSettings() {
    return ensureSettings();
  },

  async updateSettings(patch) {
    const s = await ensureSettings();
    const c = await col("settings");
    const payload = { ...patch } as any;
    delete payload._id;
    await c.doc(s._id as string).update(payload);
  },

  async listMembers() {
    return fetchAll<Member>("members");
  },

  async upsertMember(member) {
    const c = await col("members");
    if (member._id) {
      const payload = { ...member } as any;
      delete payload._id;
      await c.doc(member._id).update(payload);
      return;
    }
    const payload = { ...member } as any;
    delete payload._id;
    await c.add(payload);
  },

  async removeMember(id) {
    const c = await col("members");
    await c.doc(id).remove();
  },

  async getOpenRound() {
    const c = await col("rounds");
    const res = await c.where({ status: "open" }).limit(5).get();
    const list = (res?.data ?? []) as MealRound[];
    if (!list.length) return null;
    return { ...list[0], _id: list[0]._id ?? (list[0] as any).id };
  },

  async createRound(round) {
    const c = await col("rounds");
    const open = await this.getOpenRound();
    if (open?._id) await c.doc(open._id).update({ status: "closed" } as any);
    const payload = { ...round } as any;
    delete payload._id;
    const added = await c.add(payload);
    const id = (added as any)?.id ?? (added as any)?._id;
    return { ...round, _id: id };
  },

  async updateRound(id, patch) {
    const c = await col("rounds");
    await c.doc(id).update(patch as any);
  },

  async listRounds(limit = 30) {
    const c = await col("rounds");
    const res = await c.orderBy("createdAt", "desc").limit(limit).get();
    return (res?.data ?? []) as MealRound[];
  },

  async listOrders(roundId) {
    const c = await col("orders");
    const res = await c.where({ roundId }).limit(100).get();
    return (res?.data ?? []) as Order[];
  },

  async listAllOrders(limit = 300) {
    const c = await col("orders");
    const res = await c.orderBy("createdAt", "desc").limit(limit).get();
    return (res?.data ?? []) as Order[];
  },

  async addOrder(order) {
    const c = await col("orders");
    const payload = { ...order } as any;
    delete payload._id;
    await c.add(payload);
  },

  async updateOrder(id, patch) {
    const c = await col("orders");
    await c.doc(id).update(patch as any);
  },

  async removeOrder(id) {
    const c = await col("orders");
    await c.doc(id).remove();
  },

  async listWishes() {
    const list = await fetchAll<Wish>("wishes");
    return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async addWish(wish) {
    const c = await col("wishes");
    const payload = { ...wish } as any;
    delete payload._id;
    await c.add(payload);
  },

  async updateWish(id, patch) {
    const c = await col("wishes");
    await c.doc(id).update(patch as any);
  },

  async removeWish(id) {
    const c = await col("wishes");
    await c.doc(id).remove();
  },

  async listFavorites(memberId) {
    const c = await col("favorites");
    const res = await c.where({ memberId }).limit(200).get();
    return ((res?.data ?? []) as Favorite[]).map((x: any) => ({ ...x, _id: x._id ?? x.id }));
  },

  async addFavorite(fav) {
    const c = await col("favorites");
    const payload = { ...fav, _id: undefined } as any;
    await c.add(payload);
  },

  async removeFavorite(memberId, dishId) {
    const c = await col("favorites");
    const res = await c.where({ memberId, dishId }).limit(10).get();
    await Promise.all((res?.data ?? []).map((x: any) => c.doc(x._id ?? x.id).remove()));
  },

  subscribe(listener) {
    listeners.add(listener);
    void startRealtime();
    return () => {
      listeners.delete(listener);
    };
  },
};
