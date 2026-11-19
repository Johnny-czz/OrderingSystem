import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import type { Category, Dish } from "@/types";
import { CATEGORIES } from "@/types";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { DishCard } from "@/components/DishCard";
import { AddDishSheet } from "@/components/AddDishSheet";
import { cn } from "@/lib/utils";

/** 收藏页：与菜谱页同样的布局与交互，但只展示当前用户收藏的菜品 */
export function FavoritesPage({ onOpenDish }: { onOpenDish: (id: string) => void }) {
  const { dishes, addOrder, favorites, toggleFavorite } = useAppData();
  const { identity } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [cat, setCat] = useState<Category | "全部">("全部");
  const [sheetDish, setSheetDish] = useState<Dish | null>(null);

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const list = useMemo(() => {
    const kw = keyword.trim();
    return dishes.filter((d) => {
      if (!favSet.has(d._id ?? "")) return false;
      if (cat !== "全部" && d.category !== cat) return false;
      if (!kw) return true;
      return (
        d.name.includes(kw) ||
        d.desc.includes(kw) ||
        (d.tags ?? []).some((t) => t.includes(kw)) ||
        (d.ingredients ?? []).some((i) => i.includes(kw))
      );
    });
  }, [dishes, favSet, keyword, cat]);

  return (
    <div className="min-h-screen bg-background pb-[110px]">
      <TopBar title="我的收藏" subtitle={`收藏了 ${favSet.size} 道菜，随时照着做`} />

      <div className="px-4 pt-[60px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="在收藏里搜菜名、食材、口味标签"
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
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {list.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 px-4">
          {list.map((d) => (
            <DishCard
              key={d._id}
              dish={d}
              layout="grid"
              fav={favSet.has(d._id ?? "")}
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
      ) : (
        <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Star className="h-7 w-7" />
          </span>
          <p className="text-[14px] font-bold">还没有收藏的菜</p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            去菜谱页看到喜欢的菜，点右上角的
            <Star className="mx-0.5 inline h-3.5 w-3.5 fill-primary text-primary" />
            收藏起来，下次直接在这里找
          </p>
        </div>
      )}

      <AddDishSheet
        dish={sheetDish}
        open={Boolean(sheetDish)}
        onClose={() => setSheetDish(null)}
        onConfirm={async (qty, note) => {
          if (!sheetDish || !identity) return;
          await addOrder(identity, sheetDish, qty, note);
        }}
      />
    </div>
  );
}
