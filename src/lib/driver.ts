import type { Dish, Favorite, MealRound, Member, Order, Settings, Wish } from "@/types";

/** 数据驱动统一接口：本地 localStorage 驱动与 CloudBase 云驱动都实现它 */
export interface DataDriver {
  readonly name: "local" | "cloud";
  init(): Promise<void>;

  listDishes(): Promise<Dish[]>;
  upsertDish(dish: Dish): Promise<void>;
  removeDish(id: string): Promise<void>;

  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<void>;

  listMembers(): Promise<Member[]>;
  upsertMember(member: Member): Promise<void>;
  removeMember(id: string): Promise<void>;

  getOpenRound(): Promise<MealRound | null>;
  createRound(round: MealRound): Promise<MealRound>;
  updateRound(id: string, patch: Partial<MealRound>): Promise<void>;
  listRounds(limit?: number): Promise<MealRound[]>;

  listOrders(roundId: string): Promise<Order[]>;
  listAllOrders(limit?: number): Promise<Order[]>;
  addOrder(order: Order): Promise<void>;
  updateOrder(id: string, patch: Partial<Order>): Promise<void>;
  removeOrder(id: string): Promise<void>;

  listWishes(): Promise<Wish[]>;
  addWish(wish: Wish): Promise<void>;
  updateWish(id: string, patch: Partial<Wish>): Promise<void>;
  removeWish(id: string): Promise<void>;

  /** 收藏：按成员隔离，listFavorites 只查该成员的收藏 */
  listFavorites(memberId: string): Promise<Favorite[]>;
  addFavorite(fav: Favorite): Promise<void>;
  removeFavorite(memberId: string, dishId: string): Promise<void>;

  /** 订阅任何数据变更；返回取消订阅函数 */
  subscribe(listener: () => void): () => void;
}
