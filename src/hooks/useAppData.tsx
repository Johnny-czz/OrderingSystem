import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Dish, MealRound, Member, Order, Settings, Wish } from "@/types";
import { driver, ensureDb } from "@/lib/db";
import { todayKey, uid } from "@/lib/utils";
import type { Identity } from "@/types";

interface AppDataValue {
  ready: boolean;
  error: string | null;
  mode: "local" | "cloud";
  dishes: Dish[];
  settings: Settings | null;
  members: Member[];
  round: MealRound | null;
  orders: Order[];
  wishes: Wish[];
  history: MealRound[];
  allOrders: Order[];
  /** 当前成员收藏的 dishId 列表（未设置成员身份时为空） */
  favorites: string[];
  /** 身份就绪后设置一次，之后轮询刷新会带上收藏数据 */
  setFavoriteMember: (memberId: string) => void;
  toggleFavorite: (memberId: string, dishId: string) => Promise<void>;
  refresh: () => void;
  addOrder: (identity: Identity, dish: Dish, qty: number, note: string) => Promise<void>;
  updateOrder: (id: string, patch: Partial<Order>) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  upsertDish: (dish: Dish) => Promise<void>;
  removeDish: (id: string) => Promise<void>;
  upsertMember: (member: Member) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  addWish: (name: string, reason: string, by: string) => Promise<void>;
  toggleVote: (wish: Wish, memberId: string) => Promise<void>;
  updateWish: (id: string, patch: Partial<Wish>) => Promise<void>;
  removeWish: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  openNewRound: (title: string, by: string) => Promise<void>;
  closeRound: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [round, setRound] = useState<MealRound | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [history, setHistory] = useState<MealRound[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [tick, setTick] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberIdRef = useRef<string>("");

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureDb();
        if (!alive) return;
        const [d, s, m, r, w, h] = await Promise.all([
          driver.listDishes(),
          driver.getSettings(),
          driver.listMembers(),
          driver.getOpenRound(),
          driver.listWishes(),
          driver.listRounds(20),
        ]);
        if (!alive) return;
        setDishes(d);
        setSettings(s);
        setMembers(m);
        setRound(r);
        setWishes(w);
        setHistory(h);
        setOrders(r?._id ? await driver.listOrders(r._id) : []);
        setAllOrders(await driver.listAllOrders(300));
        if (memberIdRef.current) {
          const favs = await driver.listFavorites(memberIdRef.current);
          if (!alive) return;
          setFavorites(favs.map((f) => f.dishId));
        }
        setReady(true);
        setError(null);
      } catch (e) {
        console.error("数据加载失败", e);
        if (alive) {
          setError(e instanceof Error ? e.message : String(e));
          setReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [tick]);

  useEffect(() => {
    return driver.subscribe(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(refresh, 300);
    });
  }, [refresh]);

  const value = useMemo<AppDataValue>(
    () => ({
      ready,
      error,
      mode: driver.name,
      dishes,
      settings,
      members,
      round,
      orders,
      wishes,
      history,
      allOrders,
      favorites,
      setFavoriteMember(memberId) {
        if (memberIdRef.current === memberId) return;
        memberIdRef.current = memberId;
        refresh();
      },
      async toggleFavorite(memberId, dishId) {
        const isFav = favorites.includes(dishId);
        // 乐观更新，星标立刻反馈
        setFavorites((prev) =>
          isFav ? prev.filter((id) => id !== dishId) : [...prev, dishId],
        );
        try {
          if (isFav) await driver.removeFavorite(memberId, dishId);
          else
            await driver.addFavorite({
              memberId,
              dishId,
              createdAt: Date.now(),
            });
        } finally {
          refresh();
        }
      },
      refresh,
      async addOrder(identity, dish, qty, note) {
        if (!round?._id) throw new Error("当前没有开放的餐桌");
        const target = orders.find(
          (o) =>
            o.memberId === identity.memberId &&
            o.dishId === dish._id &&
            (o.note ?? "") === (note ?? "")
        );
        if (target?._id) {
          await driver.updateOrder(target._id, { qty: target.qty + qty });
        } else {
          await driver.addOrder({
            roundId: round._id,
            memberId: identity.memberId,
            memberName: identity.name,
            dishId: dish._id ?? "",
            dishName: dish.name,
            qty,
            note,
            status: "pending",
            createdAt: Date.now(),
          });
        }
        refresh();
      },
      async updateOrder(id, patch) {
        await driver.updateOrder(id, patch);
        refresh();
      },
      async removeOrder(id) {
        await driver.removeOrder(id);
        refresh();
      },
      async upsertDish(dish) {
        await driver.upsertDish(dish);
        refresh();
      },
      async removeDish(id) {
        await driver.removeDish(id);
        refresh();
      },
      async upsertMember(member) {
        await driver.upsertMember(member);
        refresh();
      },
      async removeMember(id) {
        await driver.removeMember(id);
        refresh();
      },
      async addWish(name, reason, by) {
        await driver.addWish({
          name,
          reason,
          proposedBy: by,
          votes: [by],
          status: "pending",
          createdAt: Date.now(),
        });
        refresh();
      },
      async toggleVote(wish, memberId) {
        if (!wish._id) return;
        const votes = wish.votes ?? [];
        const next = votes.includes(memberId)
          ? votes.filter((v) => v !== memberId)
          : [...votes, memberId];
        await driver.updateWish(wish._id, { votes: next });
        refresh();
      },
      async updateWish(id, patch) {
        await driver.updateWish(id, patch);
        refresh();
      },
      async removeWish(id) {
        await driver.removeWish(id);
        refresh();
      },
      async updateSettings(patch) {
        await driver.updateSettings(patch);
        refresh();
      },
      async openNewRound(title, by) {
        await driver.createRound({
          _id: uid("round"),
          date: todayKey(),
          title: title || "今日餐桌",
          status: "open",
          createdBy: by,
          createdAt: Date.now(),
        });
        refresh();
      },
      async closeRound() {
        if (!round?._id) return;
        await driver.updateRound(round._id, { status: "closed", closedAt: Date.now() });
        refresh();
      },
    }),
    [ready, error, dishes, settings, members, round, orders, wishes, history, allOrders, favorites, refresh]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData 必须在 AppDataProvider 内使用");
  return ctx;
}
