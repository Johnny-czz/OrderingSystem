import { useState } from "react";
import { ChefHat, Clock3, Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { PlaceholderCover } from "@/components/PlaceholderCover";
import { AddDishSheet } from "@/components/AddDishSheet";
import { cn } from "@/lib/utils";

export function DishDetailPage({ dishId, onBack }: { dishId: string; onBack: () => void }) {
  const { dishes, addOrder, round } = useAppData();
  const { identity } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const dish = dishes.find((d) => d._id === dishId);

  if (!dish) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="菜品详情" onBack={onBack} />
        <p className="pt-24 text-center text-[13px] text-muted-foreground">这道菜不见了</p>
      </div>
    );
  }

  const minutes = Math.max(10, dish.steps.length * 6);

  return (
    <div className="min-h-screen bg-background pb-[110px]">
      <TopBar title={dish.name} subtitle={dish.category} onBack={onBack} />

      <div className="relative pt-[52px]">
        <PlaceholderCover
          name={dish.name}
          coverUrl={dish.coverUrl}
          className="h-52 w-full"
          fontSize="text-6xl"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="-mt-8 px-4">
        <div className="card-shadow rounded-2xl bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[20px] font-black leading-tight">
              {dish.name}
              {dish.source && (
                <span className="ml-2 inline-block translate-y-[-2px] rounded-full bg-primary/12 px-2 py-0.5 align-middle text-[11px] font-bold text-primary">
                  {dish.source}
                </span>
              )}
            </h2>
            {dish.spicyLevel > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/12 px-2 py-1 text-[11px] font-bold text-destructive">
                <Flame className="h-3 w-3" />
                {"微辣中辣特辣".slice((dish.spicyLevel - 1) * 2, dish.spicyLevel * 2) || "辣"}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{dish.desc}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dish.tags?.map((t) => (
              <span
                key={t}
                className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-4 border-t pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />约 {minutes} 分钟
            </span>
            <span className="flex items-center gap-1">
              <ChefHat className="h-3.5 w-3.5" />
              {dish.steps.length} 步
            </span>
          </div>
        </div>

        <section className="card-shadow mt-3 rounded-2xl bg-card p-4">
          <h3 className="text-[15px] font-bold">食材</h3>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {dish.ingredients.map((ing) => (
              <li key={ing} className="flex items-start gap-1.5 text-[12.5px] leading-snug">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {ing}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-shadow mt-3 rounded-2xl bg-card p-4">
          <h3 className="text-[15px] font-bold">做法</h3>
          <ol className="mt-3 space-y-3.5">
            {dish.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                    "bg-primary/12 text-primary"
                  )}
                >
                  {i + 1}
                </span>
                <p className="flex-1 text-[13px] leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="glass-bar phone-shell fixed bottom-0 left-0 right-0 z-30 border-t px-4 pb-4 pt-2.5">
        <button
          onClick={() => setSheetOpen(true)}
          disabled={!round}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(228,87,46,.9)] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {round ? "加入今日餐桌" : "今日餐桌未开桌"}
        </button>
      </div>

      <AddDishSheet
        dish={dish}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConfirm={async (qty, note) => {
          if (!identity) return;
          await addOrder(identity, dish, qty, note);
          toast.success(`已加入 ${dish.name} ×${qty}`, {
            description: note ? `备注：${note}` : undefined,
          });
        }}
      />
    </div>
  );
}
