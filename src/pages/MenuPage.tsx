import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Category } from "@/types";
import { CATEGORIES } from "@/types";
import { useAppData } from "@/hooks/useAppData";
import { TopBar } from "@/components/TopBar";
import { DishCard } from "@/components/DishCard";
import { AddDishSheet } from "@/components/AddDishSheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Dish } from "@/types";

export function MenuPage({ onOpenDish }: { onOpenDish: (id: string) => void }) {
  const { dishes, addOrder, orders, favorites, toggleFavorite } = useAppData();
  const { identity } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [cat, setCat] = useState<Category | "全部">("全部");
  const [sheetDish, setSheetDish] = useState<Dish | null>(null);

  const myQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      if (o.memberId === identity?.memberId) map.set(o.dishId, (map.get(o.dishId) ?? 0) + o.qty);
    });
    return map;
  }, [orders, identity]);

  const list = useMemo(() => {
    const kw = keyword.trim();
    return dishes.filter((d) => {
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

  return (
    <div className="min-h-screen bg-background pb-[110px]">
      <TopBar title="菜谱库" subtitle={`共 ${dishes.length} 道菜，看看今天做什么`} />

      <div className="px-4 pt-[60px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜菜名、食材、口味标签"
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 px-4">
        {list.map((d) => (
          <DishCard
            key={d._id}
            dish={d}
            layout="grid"
            myQty={myQtyMap.get(d._id ?? "") ?? 0}
            fav={favorites.includes(d._id ?? "")}
            onToggleFav={
              identity && d._id ? () => void toggleFavorite(identity.memberId, d._id as string) : undefined
            }
            onAdd={() => setSheetDish(d)}
            onOpen={() => onOpenDish(d._id ?? "")}
          />
        ))}
      </div>

      {list.length === 0 && (
        <p className="py-14 text-center text-[12px] text-muted-foreground">
          没找到这道菜，可以去「心愿」里提一个
        </p>
      )}

      <AddDishSheet
        dish={sheetDish}
        open={Boolean(sheetDish)}
        onClose={() => setSheetDish(null)}
        onConfirm={async (qty, note) => {
          if (!sheetDish || !identity) return;
          await addOrder(identity, sheetDish, qty, note);
          toast.success(`已加入今日餐桌：${sheetDish.name} ×${qty}`);
        }}
      />
    </div>
  );
}
