import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Dish } from "@/types";
import { BottomSheet } from "./BottomSheet";
import { PlaceholderCover } from "./PlaceholderCover";
import { cn } from "@/lib/utils";

const QUICK_NOTES = ["不要辣", "少油少盐", "多加辣", "不要香菜", "不要葱姜蒜", "软烂一点", "多放醋"];

interface Props {
  dish: Dish | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (qty: number, note: string) => void;
}

export function AddDishSheet({ dish, open, onClose, onConfirm }: Props) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const close = () => {
    setQty(1);
    setNote("");
    onClose();
  };

  if (!dish) return null;

  return (
    <BottomSheet open={open} title="加入今日餐桌" onClose={close}>
      <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
        <PlaceholderCover
          name={dish.name}
          coverUrl={dish.coverUrl}
          className="h-14 w-14 rounded-xl"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{dish.name}</p>
          <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {dish.desc}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border px-3 py-2.5">
        <span className="text-[13px] font-semibold">份数</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span key={qty} className="animate-pop min-w-6 text-center text-[18px] font-bold">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-2 text-[13px] font-semibold">口味 / 忌口备注</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_NOTES.map((t) => {
            const active = note.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setNote((cur) => {
                    if (active) return cur.replace(t, "").replace(/、{1,}/g, "、").replace(/^、|、$/g, "");
                    return cur ? `${cur}、${t}` : t;
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95",
                  active
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="也可以自己写，比如：给孩子留一份不加辣"
          className="mt-2.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <button
        onClick={() => {
          onConfirm(qty, note.trim());
          close();
        }}
        className="mt-5 h-12 w-full rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(228,87,46,.9)] transition-transform active:scale-[0.98]"
      >
        确认加入 · {qty} 份
      </button>
    </BottomSheet>
  );
}
