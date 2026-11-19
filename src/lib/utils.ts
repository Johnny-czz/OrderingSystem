import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 由字符串生成稳定的暖色渐变，用于菜品占位封面 */
export function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  const hue = 8 + (h % 42); // 8° ~ 50°：橙 → 琥珀 → 金黄
  return {
    from: `hsl(${hue} 92% 62%)`,
    to: `hsl(${(hue + 26) % 360} 84% 46%)`,
    hue,
  };
}

export function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 17 + seed.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 62% 48%)`;
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

export function formatDateLabel(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  const today = todayKey();
  if (dateKey === today) return "今天";
  return `${Number(m)}月${Number(d)}日`;
}

export interface DishAgg {
  dishId: string;
  dishName: string;
  totalQty: number;
  notes: string[];
  byMember: { memberName: string; qty: number; note: string }[];
}

export interface MemberAgg {
  memberId: string;
  memberName: string;
  totalQty: number;
  items: { dishName: string; qty: number; note: string }[];
}

export function aggregateByDish(
  orders: { dishId: string; dishName: string; qty: number; note: string; memberName: string }[]
): DishAgg[] {
  const map = new Map<string, DishAgg>();
  orders.forEach((o) => {
    const cur = map.get(o.dishId) ?? {
      dishId: o.dishId,
      dishName: o.dishName,
      totalQty: 0,
      notes: [],
      byMember: [],
    };
    cur.totalQty += o.qty;
    if (o.note) cur.notes.push(o.note);
    cur.byMember.push({ memberName: o.memberName, qty: o.qty, note: o.note });
    map.set(o.dishId, cur);
  });
  return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
}

export function aggregateByMember(
  orders: { memberId: string; memberName: string; dishName: string; qty: number; note: string }[]
): MemberAgg[] {
  const map = new Map<string, MemberAgg>();
  orders.forEach((o) => {
    const cur = map.get(o.memberId) ?? {
      memberId: o.memberId,
      memberName: o.memberName,
      totalQty: 0,
      items: [],
    };
    cur.totalQty += o.qty;
    cur.items.push({ dishName: o.dishName, qty: o.qty, note: o.note });
    map.set(o.memberId, cur);
  });
  return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
}
