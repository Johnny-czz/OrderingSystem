import { Plus, Star } from "lucide-react";
import type { Dish } from "@/types";
import { cn } from "@/lib/utils";
import { PlaceholderCover } from "./PlaceholderCover";

interface Props {
  dish: Dish;
  myQty?: number;
  onAdd: () => void;
  onOpen: () => void;
  layout?: "row" | "grid";
  /** 是否已收藏；未传 onToggleFav 时不显示星标 */
  fav?: boolean;
  onToggleFav?: () => void;
}

function FavStar({
  fav,
  onToggle,
  size = "h-4 w-4",
  btnCls = "h-7 w-7",
}: {
  fav: boolean;
  onToggle: () => void;
  size?: string;
  btnCls?: string;
}) {
  return (
    <button
      aria-label={fav ? "取消收藏" : "收藏"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "z-10 flex items-center justify-center rounded-full bg-background/75 shadow-sm backdrop-blur-sm transition-all active:scale-90",
        btnCls,
      )}
    >
      <Star
        className={cn(
          size,
          "transition-colors",
          fav ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/80",
        )}
      />
    </button>
  );
}

export function DishCard({ dish, myQty = 0, onAdd, onOpen, layout = "row", fav, onToggleFav }: Props) {
  if (layout === "grid") {
    return (
      <div className="card-shadow group relative overflow-hidden rounded-2xl bg-card transition-transform duration-200 active:scale-[0.97]">
        {onToggleFav && (
          <div className="absolute right-1.5 top-1.5 z-10">
            <FavStar fav={Boolean(fav)} onToggle={onToggleFav} btnCls="h-6 w-6" size="h-3.5 w-3.5" />
          </div>
        )}
        <button onClick={onOpen} className="block w-full text-left">
          <PlaceholderCover
            name={dish.name}
            coverUrl={dish.coverUrl}
            className="h-24 w-full"
            fontSize="text-3xl"
          />
        </button>
        <div className="p-2.5">
          <button onClick={onOpen} className="block w-full text-left">
            <p className="truncate text-[13px] font-semibold leading-tight">
              {dish.name}
              {dish.source && (
                <span className="ml-1.5 rounded bg-primary/12 px-1 py-px align-[1px] text-[9px] font-bold text-primary">
                  {dish.source}
                </span>
              )}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {dish.desc}
            </p>
          </button>
          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {dish.category}
            </span>
            <button
              onClick={onAdd}
              className={cn(
                "flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold transition-all active:scale-95",
                myQty > 0
                  ? "bg-primary/12 text-primary"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              {myQty > 0 ? `已点 ${myQty}` : "点"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-shadow flex items-center gap-3 rounded-2xl bg-card p-3 transition-transform duration-200 active:scale-[0.99]">
      <div className="relative shrink-0">
        <button onClick={onOpen} className="block">
          <PlaceholderCover
            name={dish.name}
            coverUrl={dish.coverUrl}
            className="h-[68px] w-[68px] rounded-xl"
          />
        </button>
        {onToggleFav && (
          <div className="absolute -right-1.5 -top-1.5">
            <FavStar fav={Boolean(fav)} onToggle={onToggleFav} btnCls="h-6 w-6" size="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="block w-full text-left">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-bold leading-tight">{dish.name}</p>
            {dish.source && (
              <span className="shrink-0 rounded bg-primary/12 px-1 py-px text-[10px] font-bold text-primary">
                {dish.source}
              </span>
            )}
            {dish.spicyLevel > 0 && (
              <span className="shrink-0 rounded bg-destructive/12 px-1 py-[1px] text-[10px] font-semibold text-destructive">
                {"辣".repeat(dish.spicyLevel)}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {dish.desc}
          </p>
        </button>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {dish.tags?.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2 py-[1px] text-[10px] font-medium text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onAdd}
        aria-label={`点${dish.name}`}
        className={cn(
          "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full transition-all active:scale-90",
          myQty > 0
            ? "bg-primary/12 text-primary ring-1 ring-primary/30"
            : "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_rgba(228,87,46,.7)]"
        )}
      >
        {myQty > 0 ? (
          <span className="text-[13px] font-bold leading-none">{myQty}</span>
        ) : (
          <Plus className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
