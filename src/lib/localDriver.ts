import type { Dish, Favorite, MealRound, Member, Order, Settings, Wish } from "@/types";
import type { DataDriver } from "./driver";
import { buildDefaultSettings, makeMember } from "./auth";
import { todayKey, uid } from "./utils";
import seedDishes from "../../db/seed/dishes.json";

const STORAGE_KEY = "family-ordering::localdb::v1";

interface LocalDB {
  dishes: Dish[];
  members: Member[];
  settings: Settings | null;
  rounds: MealRound[];
  orders: Order[];
  wishes: Wish[];
  favorites?: Favorite[];
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

let cache: LocalDB | null = null;

function read(): LocalDB {
  if (cache) return cache;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw) as LocalDB;
      return cache;
    } catch (error) {
      console.error("本地数据解析失败，将重新初始化", error);
    }
  }
  cache = { dishes: [], members: [], settings: null, rounds: [], orders: [], wishes: [], favorites: [] };
  return cache;
}

function write(next: LocalDB) {
  cache = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

function mutate(fn: (db: LocalDB) => void) {
  const db = read();
  fn(db);
  write(db);
}

async function seed() {
  const db = read();
  if (db.settings) return;

  const dishes: Dish[] = (seedDishes as Omit<Dish, "_id" | "createdAt">[]).map((d, i) => ({
    ...(d as Dish),
    _id: uid("dish"),
    coverUrl: d.coverUrl ?? "",
    source: d.source ?? "",
    available: true,
    sort: i,
    createdAt: Date.now() - (70 - i) * 1000,
  }));

  const settings = await buildDefaultSettings();
  const adminMember = makeMember("我（管理员）", "admin");
  adminMember._id = uid("m");
  adminMember.username = settings.adminUsername;

  db.dishes = dishes;
  db.settings = settings;
  db.members = [adminMember];
  db.rounds = [
    {
      _id: uid("round"),
      date: todayKey(),
      title: "今日餐桌",
      status: "open",
      createdBy: adminMember._id,
      createdAt: Date.now(),
    },
  ];
  db.orders = [];
  db.wishes = [];
  write(db);
}

export const localDriver: DataDriver = {
  name: "local",

  async init() {
    await seed();
  },

  async listDishes() {
    return [...read().dishes].sort((a, b) => a.sort - b.sort);
  },

  async upsertDish(dish) {
    mutate((db) => {
      const idx = db.dishes.findIndex((d) => d._id === dish._id);
      if (idx >= 0) db.dishes[idx] = { ...dish };
      else db.dishes.push({ ...dish, _id: dish._id ?? uid("dish") });
    });
  },

  async removeDish(id) {
    mutate((db) => {
      db.dishes = db.dishes.filter((d) => d._id !== id);
    });
  },

  async getSettings() {
    const db = read();
    if (!db.settings) {
      await seed();
      return read().settings as Settings;
    }
    return db.settings;
  },

  async updateSettings(patch) {
    mutate((db) => {
      db.settings = { ...(db.settings as Settings), ...patch };
    });
  },

  async listMembers() {
    return [...read().members];
  },

  async upsertMember(member) {
    mutate((db) => {
      const idx = db.members.findIndex((m) => m._id === member._id);
      if (idx >= 0) db.members[idx] = { ...member };
      else db.members.push({ ...member, _id: member._id ?? uid("m") });
    });
  },

  async removeMember(id) {
    mutate((db) => {
      db.members = db.members.filter((m) => m._id !== id);
    });
  },

  async getOpenRound() {
    return read().rounds.find((r) => r.status === "open") ?? null;
  },

  async createRound(round) {
    const next: MealRound = { ...round, _id: round._id ?? uid("round") };
    mutate((db) => {
      db.rounds.forEach((r) => {
        if (r.status === "open") r.status = "closed";
      });
      db.rounds.push(next);
    });
    return next;
  },

  async updateRound(id, patch) {
    mutate((db) => {
      const target = db.rounds.find((r) => r._id === id);
      if (target) Object.assign(target, patch);
    });
  },

  async listRounds(limit = 30) {
    return [...read().rounds]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  async listOrders(roundId) {
    return read().orders.filter((o) => o.roundId === roundId);
  },

  async listAllOrders(limit = 500) {
    return [...read().orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },

  async addOrder(order) {
    mutate((db) => {
      db.orders.push({ ...order, _id: order._id ?? uid("order") });
    });
  },

  async updateOrder(id, patch) {
    mutate((db) => {
      const target = db.orders.find((o) => o._id === id);
      if (target) Object.assign(target, patch);
    });
  },

  async removeOrder(id) {
    mutate((db) => {
      db.orders = db.orders.filter((o) => o._id !== id);
    });
  },

  async listWishes() {
    return [...read().wishes].sort((a, b) => b.createdAt - a.createdAt);
  },

  async addWish(wish) {
    mutate((db) => {
      db.wishes.push({ ...wish, _id: wish._id ?? uid("wish") });
    });
  },

  async updateWish(id, patch) {
    mutate((db) => {
      const target = db.wishes.find((w) => w._id === id);
      if (target) Object.assign(target, patch);
    });
  },

  async removeWish(id) {
    mutate((db) => {
      db.wishes = db.wishes.filter((w) => w._id !== id);
    });
  },

  async listFavorites(memberId) {
    return (read().favorites ?? []).filter((f) => f.memberId === memberId);
  },

  async addFavorite(fav) {
    mutate((db) => {
      db.favorites ??= [];
      if (!db.favorites.some((f) => f.memberId === fav.memberId && f.dishId === fav.dishId)) {
        db.favorites.push({ ...fav, _id: fav._id ?? uid("fav") });
      }
    });
  },

  async removeFavorite(memberId, dishId) {
    mutate((db) => {
      db.favorites = (db.favorites ?? []).filter(
        (f) => !(f.memberId === memberId && f.dishId === dishId),
      );
    });
  },

  subscribe(listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
};
