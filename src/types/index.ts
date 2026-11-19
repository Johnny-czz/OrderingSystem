export type Category = "荤菜" | "素菜" | "汤羹" | "主食" | "凉菜";

export const CATEGORIES: Category[] = ["荤菜", "素菜", "汤羹", "主食", "凉菜"];

export interface Dish {
  _id?: string;
  name: string;
  category: Category;
  desc: string;
  /** 为空时前端渲染渐变占位封面 */
  coverUrl?: string;
  /** 出处作者，如「村驴」「隋坡」；空表示通用家常版 */
  source?: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  spicyLevel: 0 | 1 | 2 | 3;
  available: boolean;
  sort: number;
  createdAt: number;
}

export type OrderStatus = "pending" | "done";

export interface Order {
  _id?: string;
  roundId: string;
  memberId: string;
  memberName: string;
  dishId: string;
  dishName: string;
  qty: number;
  note: string;
  status: OrderStatus;
  createdAt: number;
}

export interface MealRound {
  _id?: string;
  date: string;
  title: string;
  status: "open" | "closed";
  createdBy: string;
  createdAt: number;
  closedAt?: number;
}

export interface Member {
  _id?: string;
  name: string;
  role: "admin" | "member";
  /** 账号密码登录模式下由管理员分配 */
  username?: string;
  passwordSalt?: string;
  passwordHash?: string;
  color: string;
  active: boolean;
  createdAt: number;
}

export type AuthMode = "guest" | "password";

export interface Settings {
  _id?: string;
  familyName: string;
  notice: string;
  authMode: AuthMode;
  adminUsername: string;
  adminSalt: string;
  adminPasswordHash: string;
  adminMustChangePassword: boolean;
}

export type WishStatus = "pending" | "approved" | "rejected";

/** 成员对某道菜的收藏：按 memberId 隔离，每人只看自己的 */
export interface Favorite {
  _id?: string;
  memberId: string;
  dishId: string;
  createdAt: number;
}

export interface Wish {
  _id?: string;
  name: string;
  reason: string;
  proposedBy: string;
  votes: string[];
  status: WishStatus;
  createdAt: number;
}

/** 当前登录身份 */
export interface Identity {
  memberId: string;
  name: string;
  role: "admin" | "member";
  color: string;
}

export type RouteName =
  | "enter"
  | "table"
  | "menu"
  | "fav"
  | "dish"
  | "wish"
  | "me"
  | "admin";

export interface Route {
  name: RouteName;
  dishId?: string;
}
