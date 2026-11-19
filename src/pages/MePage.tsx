import { useMemo } from "react";
import {
  ChevronRight,
  History,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { PlaceholderCover } from "@/components/PlaceholderCover";
import { aggregateByDish, cn, formatDateLabel } from "@/lib/utils";
import type { RouteName } from "@/types";

export function MePage({
  onNavigate,
  onOpenDish,
}: {
  onNavigate: (name: RouteName) => void;
  onOpenDish: (id: string) => void;
}) {
  const { allOrders, history, dishes, round, addOrder, mode, refresh } = useAppData();
  const { identity, isAdmin, logout } = useAuth();

  const favorites = useMemo(() => {
    const agg = aggregateByDish(allOrders);
    return agg.slice(0, 8).map((a) => ({ ...a, dish: dishes.find((d) => d._id === a.dishId) }));
  }, [allOrders, dishes]);

  const closedRounds = history.filter((r) => r.status === "closed");
  const myTotal = allOrders
    .filter((o) => o.memberId === identity?.memberId)
    .reduce((s, o) => s + o.qty, 0);

  return (
    <div className="min-h-screen bg-background pb-[110px]">
      <TopBar title="我的" subtitle={mode === "cloud" ? "数据已云端同步" : "本机演示数据"} />

      <div className="px-4 pt-[60px]">
        <div className="card-shadow flex items-center gap-3 rounded-2xl bg-card p-4">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-[17px] font-black text-white"
            style={{ backgroundColor: identity?.color ?? "hsl(13.5 77% 53.7%)" }}
          >
            {(identity?.name ?? "?").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[16px] font-bold">{identity?.name}</p>
              {isAdmin && (
                <span className="rounded-full bg-primary/12 px-1.5 py-[1px] text-[10px] font-bold text-primary">
                  管理员
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              累计点了 {myTotal} 份 · 参与 {new Set(allOrders.filter((o) => o.memberId === identity?.memberId).map((o) => o.roundId)).size} 桌
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              toast.success("已退出");
            }}
            className="flex h-9 items-center gap-1 rounded-full bg-muted px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            退出
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={() => onNavigate("admin")}
            className="card-shadow mt-3 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-[#FF7A45] p-4 text-left text-primary-foreground transition-transform active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold">管理员后台</span>
              <span className="block text-[11px] opacity-90">
                菜谱管理 · 订单看板 · 成员与访问设置
              </span>
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <section className="mt-5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-[14px] font-bold">常点清单</h2>
          </div>
          {favorites.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              还没有记录，点几次菜这里就会自动统计
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {favorites.map((f) => (
                <div
                  key={f.dishId}
                  className="flex items-center gap-2.5 rounded-2xl border bg-card p-2.5"
                >
                  <PlaceholderCover
                    name={f.dishName}
                    coverUrl={f.dish?.coverUrl}
                    className="h-11 w-11 rounded-lg"
                    fontSize="text-base"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{f.dishName}</p>
                    <p className="text-[11px] text-muted-foreground">累计 {f.totalQty} 份</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!identity) return;
                      if (!f.dish) {
                        toast.error("这道菜已从菜谱移除");
                        return;
                      }
                      if (!round) {
                        toast.error("今日餐桌还没开");
                        return;
                      }
                      await addOrder(identity, f.dish, 1, "");
                      toast.success(`再点一份 ${f.dishName}`);
                    }}
                    className="flex h-8 items-center gap-1 rounded-full bg-primary/12 px-3 text-[12px] font-bold text-primary transition-transform active:scale-95"
                  >
                    <RefreshCw className="h-3 w-3" />
                    再点
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center gap-1.5">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-[14px] font-bold">历史餐桌</h2>
          </div>
          {closedRounds.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              还没有已结束的餐桌记录
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {closedRounds.map((r) => {
                const items = allOrders.filter((o) => o.roundId === r._id);
                const qty = items.reduce((s, o) => s + o.qty, 0);
                return (
                  <div key={r._id} className="rounded-2xl border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-bold">{formatDateLabel(r.date)} · {r.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        共 {qty} 份
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      {items.map((o) => o.dishName).join("、") || "没有人点菜"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <button
          onClick={() => {
            refresh();
            toast.success("已刷新");
          }}
          className={cn("mt-6 w-full rounded-2xl border border-dashed py-3 text-[12px] text-muted-foreground")}
        >
          手动刷新数据
        </button>
      </div>
    </div>
  );
}
