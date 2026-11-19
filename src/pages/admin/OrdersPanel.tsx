import { useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { aggregateByDish, aggregateByMember, cn } from "@/lib/utils";
import type { Order } from "@/types";

export function OrdersPanel() {
  const { orders, round, updateOrder, removeOrder, closeRound, openNewRound, history } =
    useAppData();
  const { identity } = useAuth();
  const [tab, setTab] = useState<"dish" | "member">("dish");

  const byDish = aggregateByDish(orders);
  const byMember = aggregateByMember(orders);
  const totalQty = orders.reduce((s, o) => s + o.qty, 0);
  const doneQty = orders.filter((o) => o.status === "done").reduce((s, o) => s + o.qty, 0);

  const toggleOne = async (o: Order) => {
    if (!o._id) return;
    await updateOrder(o._id, { status: o.status === "done" ? "pending" : "done" });
  };

  const markAllDone = async () => {
    const pending = orders.filter((o) => o.status === "pending");
    if (pending.length === 0) {
      toast.success("都做完了");
      return;
    }
    for (const o of pending) {
      if (o._id) await updateOrder(o._id, { status: "done" });
    }
    toast.success(`已标记 ${pending.length} 项为已做好`);
  };

  return (
    <div>
      <div className="card-shadow rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold">{round?.title ?? "未开桌"}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              共 {totalQty} 份 · 已做好 {doneQty} 份
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              round ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            {round ? "进行中" : "已结束"}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={markAllDone} className="h-9 flex-1 rounded-xl text-[13px] font-bold">
            全部标记已做好
          </Button>
          {round ? (
            <Button
              onClick={async () => {
                await closeRound();
                toast.success("今日餐桌已结束");
              }}
              variant="outline"
              className="h-9 flex-1 rounded-xl text-[13px]"
            >
              结束这一桌
            </Button>
          ) : (
            <Button
              onClick={async () => {
                if (!identity) return;
                await openNewRound("今日餐桌", identity.memberId);
                toast.success("已开新桌");
              }}
              variant="outline"
              className="h-9 flex-1 rounded-xl text-[13px]"
            >
              开新的一桌
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-1 rounded-full bg-muted p-1">
        {(["dish", "member"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-8 flex-1 rounded-full text-[13px] font-semibold transition-all",
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t === "dish" ? "按菜备菜" : "按人看"}
          </button>
        ))}
      </div>

      {orders.length === 0 && (
        <p className="py-10 text-center text-[12px] text-muted-foreground">
          这一桌还没有人点菜
        </p>
      )}

      <div className="mt-3 space-y-2">
        {tab === "dish" &&
          byDish.map((d) => {
            const items = orders.filter((o) => o.dishId === d.dishId);
            const allDone = items.every((o) => o.status === "done");
            return (
              <div
                key={d.dishId}
                className={cn(
                  "rounded-2xl border bg-card p-3 transition-opacity",
                  allDone && "opacity-55"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-bold">{d.dishName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.byMember.map((m) => `${m.memberName}×${m.qty}`).join("、")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-[12px] font-black text-primary">
                    {d.totalQty} 份
                  </span>
                </div>

                {d.notes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
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

                <div className="mt-2.5 space-y-1 border-t pt-2">
                  {items.map((o) => (
                    <div key={o._id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleOne(o)}
                        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-success"
                      >
                        {o.status === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </button>
                      <span className="min-w-0 flex-1 truncate text-[12px]">
                        {o.memberName} ×{o.qty}
                        {o.note && <span className="text-muted-foreground">（{o.note}）</span>}
                      </span>
                      <button
                        onClick={async () => await removeOrder(o._id as string)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

        {tab === "member" &&
          byMember.map((m) => (
            <div key={m.memberId} className="rounded-2xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-[14.5px] font-bold">{m.memberName}</p>
                <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[12px] font-black text-primary">
                  {m.totalQty} 份
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
      </div>

      {history.filter((r) => r.status === "closed").length > 0 && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          已结束的餐桌共 {history.filter((r) => r.status === "closed").length} 桌，可在「我的 → 历史餐桌」查看
        </p>
      )}
    </div>
  );
}
