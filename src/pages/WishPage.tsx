import { useState } from "react";
import { Check, Heart, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dish, Wish } from "@/types";

export function WishPage() {
  const { wishes, addWish, toggleVote, updateWish, removeWish, upsertDish, dishes } = useAppData();
  const { identity, isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [showDone, setShowDone] = useState(false);

  const pending = wishes.filter((w) => w.status === "pending");
  const done = wishes.filter((w) => w.status !== "pending");

  const submit = async () => {
    if (!name.trim() || !identity) return;
    const exists = wishes.some((w) => w.name === name.trim() && w.status === "pending");
    if (exists) {
      toast.error("已经有人提过这道菜啦，去给它投票吧");
      return;
    }
    await addWish(name.trim(), reason.trim(), identity.name);
    setName("");
    setReason("");
    toast.success("心愿已提交");
  };

  const approve = async (wish: Wish) => {
    const exists = dishes.some((d) => d.name === wish.name);
    if (!exists) {
      const dish: Dish = {
        name: wish.name,
        category: "荤菜",
        desc: `来自${wish.proposedBy}的心愿菜：${wish.reason || "家人想吃"}`,
        coverUrl: "",
        ingredients: ["（待补充食材）"],
        steps: ["（待补充做法，可在菜谱管理里编辑）"],
        tags: ["心愿菜"],
        spicyLevel: 0,
        available: true,
        sort: 999,
        createdAt: Date.now(),
      };
      await upsertDish(dish);
    }
    await updateWish(wish._id as string, { status: "approved" });
    toast.success(`已把「${wish.name}」加入菜谱`);
  };

  return (
    <div className="min-h-screen bg-background pb-[110px]">
      <TopBar title="心愿菜" subtitle="想吃什么就提，大家投票，管理员来决定做不做" />

      <div className="px-4 pt-[60px]">
        <div className="card-shadow rounded-2xl bg-card p-4">
          <p className="text-[14px] font-bold">我想吃…</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="菜名，比如：水煮牛肉"
            className="mt-2.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="理由（可不填）：好久没吃了"
            className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button
            onClick={submit}
            disabled={!name.trim()}
            className="mt-3 h-11 w-full rounded-xl font-bold"
          >
            <Plus className="h-4 w-4" />
            提交心愿
          </Button>
        </div>

        <h2 className="mb-2 mt-5 text-[14px] font-bold">
          待实现（{pending.length}）
        </h2>
        {pending.length === 0 && (
          <p className="py-8 text-center text-[12px] text-muted-foreground">
            还没有心愿，想到什么就提一个吧
          </p>
        )}
        <div className="space-y-2">
          {pending.map((w) => {
            const voted = Boolean(identity && w.votes?.includes(identity.memberId));
            return (
              <div key={w._id} className="card-shadow rounded-2xl bg-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-tight">{w.name}</p>
                    {w.reason && (
                      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                        {w.reason}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {w.proposedBy} 提议
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!identity) return;
                      await toggleVote(w, identity.memberId);
                    }}
                    className={cn(
                      "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all active:scale-95",
                      voted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", voted && "fill-current")} />
                    {w.votes?.length ?? 0}
                  </button>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex gap-2 border-t pt-2.5">
                    <button
                      onClick={() => approve(w)}
                      className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-success/15 text-[12px] font-bold text-success"
                    >
                      <Check className="h-3.5 w-3.5" />
                      采纳进菜谱
                    </button>
                    <button
                      onClick={async () => {
                        await updateWish(w._id as string, { status: "rejected" });
                        toast.success("已驳回");
                      }}
                      className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-muted text-[12px] font-bold text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                      驳回
                    </button>
                    <button
                      onClick={async () => await removeWish(w._id as string)}
                      className="flex h-8 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {done.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="text-[13px] font-semibold text-muted-foreground"
            >
              {showDone ? "收起" : "查看"}已处理（{done.length}）
            </button>
            {showDone && (
              <div className="mt-2 space-y-1.5">
                {done.map((w) => (
                  <div
                    key={w._id}
                    className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px]">{w.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        w.status === "approved"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {w.status === "approved" ? "已采纳" : "已驳回"}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={async () => await removeWish(w._id as string)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
