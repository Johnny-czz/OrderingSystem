import { useMemo, useState } from "react";
import { Search, Soup, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import type { Category, Dish } from "@/types";
import { CATEGORIES } from "@/types";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { DishCard } from "@/components/DishCard";
import { AddDishSheet } from "@/components/AddDishSheet";
import { FamilySummary } from "@/components/FamilySummary";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";

export function TablePage({ onOpenDish }: { onOpenDish: (id: string) => void }) {
  const { dishes, orders, round, settings, addOrder, removeOrder, openNewRound, favorites, toggleFavorite } =
    useAppData();
  const { identity, isAdmin } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [cat, setCat] = useState<Category | "全部">("全部");
  const [sheetDish, setSheetDish] = useState<Dish | null>(null);

  const myQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      if (o.memberId === identity?.memberId) {
        map.set(o.dishId, (map.get(o.dishId) ?? 0) + o.qty);
      }
    });
    return map;
  }, [orders, identity]);

  const myOrders = orders.filter((o) => o.memberId === identity?.memberId);

  const list = useMemo(() => {
    const kw = keyword.trim();
    return dishes.filter((d) => {
      if (!d.available) return false;
      if (cat !== "全部" && d.category !== cat) return false;
      if (!kw) return true;
      return (
        d.name.includes(kw) ||
        d.desc.includes(kw) ||
        (d.tags ?? []).some((t) => t.includes(kw)) ||
        (d.ingredients ?? []).some((i) => i.includes(kw))
      );
    });
  }, [dishes, keyword, cat]);

  if (!round) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={settings?.familyName ?? "今日餐桌"} subtitle="还没有开桌" />
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Soup className="h-8 w-8" />
          </span>
          <p className="mt-4 text-[16px] font-bold">今天的餐桌还没开</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            {isAdmin ? "点下面的按钮开桌，家人就能开始点菜了" : "等管理员（做饭的那位）开桌后再来点菜～"}
          </p>
          {isAdmin && identity && (
            <Button
              onClick={async () => {
                await openNewRound("今日餐桌", identity.memberId);
                toast.success("已开桌，快去告诉家人");
              }}
              className="mt-5 h-11 rounded-2xl px-6 font-bold"
            >
              开一桌
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[150px]">
      <TopBar
        title={settings?.familyName ?? "今日餐桌"}
        subtitle={`${round.title} · 已开桌 · ${identity?.name ?? ""}`}
      />

      <div className="px-4 pt-[60px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜菜名、食材，比如「牛肉」「汤」"
            className="h-11 w-full rounded-2xl border border-input bg-card pl-10 pr-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {(["全部", ...CATEGORIES] as (Category | "全部")[]).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all active:scale-95",
                cat === c
                  ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_rgba(228,87,46,.8)]"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {myOrders.length > 0 && (
        <section className="mt-4 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold">我点的（{myOrders.length}）</h2>
            <span className="text-[11px] text-muted-foreground">共 {myOrders.reduce((s, o) => s + o.qty, 0)} 份</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {myOrders.map((o) => (
              <div
                key={o._id}
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2"
              >
                <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{o.dishName}</span>
                <span className="shrink-0 text-[12px] font-bold text-primary">×{o.qty}</span>
                {o.note && (
                  <span className="shrink-0 rounded bg-warning/15 px-1.5 py-[1px] text-[10px] text-warning-foreground">
                    {o.note}
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatTime(o.createdAt)}
                </span>
                <button
                  onClick={async () => {
                    await removeOrder(o._id as string);
                    toast.success(`已撤销 ${o.dishName}`);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4 px-4">
        <h2 className="mb-2 text-[14px] font-bold">
          菜谱库 <span className="text-[11px] font-normal text-muted-foreground">（{list.length} 道可选）</span>
        </h2>
        {list.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-muted-foreground">没有匹配的菜，换个关键词试试</p>
        ) : (
          <div className="space-y-2">
            {list.map((d) => (
              <DishCard
                key={d._id}
                dish={d}
                myQty={myQtyMap.get(d._id ?? "") ?? 0}
                fav={favorites.includes(d._id ?? "")}
                onToggleFav={
                  identity && d._id
                    ? () => void toggleFavorite(identity.memberId, d._id as string)
                    : undefined
                }
                onAdd={() => setSheetDish(d)}
                onOpen={() => onOpenDish(d._id ?? "")}
              />
            ))}
          </div>
        )}
      </section>

      <AddDishSheet
        dish={sheetDish}
        open={Boolean(sheetDish)}
        onClose={() => setSheetDish(null)}
        onConfirm={async (qty, note) => {
          if (!sheetDish || !identity) return;
          await addOrder(identity, sheetDish, qty, note);
          toast.success(`已加入 ${sheetDish.name} ×${qty}`, {
            description: note ? `备注：${note}` : undefined,
          });
        }}
      />

      <FamilySummary orders={orders} isAdmin={isAdmin} />
    </div>
  );
}
