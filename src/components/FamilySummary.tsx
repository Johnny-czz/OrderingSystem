import { useState } from "react";
import { ChevronUp, Users } from "lucide-react";
import type { Order } from "@/types";
import { aggregateByDish, aggregateByMember, cn } from "@/lib/utils";
import { BottomSheet } from "./BottomSheet";

interface Props {
  orders: Order[];
  isAdmin: boolean;
  onToggleDone?: (id: string, current: Order["status"]) => void;
}

export function FamilySummary({ orders, isAdmin, onToggleDone }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"member" | "dish">("member");

  const totalQty = orders.reduce((s, o) => s + o.qty, 0);
  const byMember = aggregateByMember(orders);
  const byDish = aggregateByDish(orders);

  if (orders.length === 0) return null;

  return (
    <>
      <div className="pointer-events-none fixed bottom-[60px] left-0 right-0 z-30 flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="phone-shell pointer-events-auto mx-3 w-full overflow-hidden"
        >
          <div className="glass-bar card-shadow flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-transform active:scale-[0.99]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Users className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-tight">
                全家已点 {totalQty} 份 · {byDish.length} 道菜
              </p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {byMember.map((m) => `${m.memberName} ${m.totalQty}`).join(" · ")}
              </p>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </button>
      </div>

      <BottomSheet open={open} title="全家点餐汇总" onClose={() => setOpen(false)}>
        <div className="mb-3 flex gap-1 rounded-full bg-muted p-1">
          {(["member", "dish"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "h-8 flex-1 rounded-full text-[13px] font-semibold transition-all",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {t === "member" ? "按人看" : "按菜看"}
            </button>
          ))}
        </div>

        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-0.5">
          {tab === "member" &&
            byMember.map((m) => (
              <div key={m.memberId} className="rounded-2xl border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold">{m.memberName}</p>
                  <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary">
                    共 {m.totalQty} 份
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {m.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px]">
                      <span className="font-medium">· {it.dishName}</span>
                      <span className="text-muted-foreground">×{it.qty}</span>
                      {it.note && (
                        <span className="rounded bg-warning/15 px-1.5 py-[1px] text-[11px] text-warning-foreground">
                          {it.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          {tab === "dish" &&
            byDish.map((d) => (
              <div key={d.dishId} className="rounded-2xl border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold">{d.dishName}</p>
                  <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary">
                    共 {d.totalQty} 份
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {d.byMember.map((m) => `${m.memberName}×${m.qty}`).join("、")}
                </p>
                {d.notes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[...new Set(d.notes)].map((n) => (
                      <span
                        key={n}
                        className="rounded bg-warning/15 px-1.5 py-[1px] text-[11px] text-warning-foreground"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {isAdmin && onToggleDone && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            在「我的 → 管理员后台 → 订单看板」里可以标记已做好
          </p>
        )}
      </BottomSheet>
    </>
  );
}
