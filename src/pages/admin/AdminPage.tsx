import { useState } from "react";
import { ArrowLeft, ClipboardList, Settings, UsersRound, Utensils } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { DishesPanel } from "./DishesPanel";
import { OrdersPanel } from "./OrdersPanel";
import { MembersPanel } from "./MembersPanel";
import { SettingsPanel } from "./SettingsPanel";
import { ForceChangePasswordDialog } from "./ForceChangePasswordDialog";
import { cn } from "@/lib/utils";
import type { RouteName } from "@/types";

type Tab = "dishes" | "orders" | "members" | "settings";

const TABS: { key: Tab; label: string; icon: typeof Utensils }[] = [
  { key: "orders", label: "订单看板", icon: ClipboardList },
  { key: "dishes", label: "菜谱管理", icon: Utensils },
  { key: "members", label: "成员账号", icon: UsersRound },
  { key: "settings", label: "访问设置", icon: Settings },
];

export function AdminPage({ onNavigate }: { onNavigate: (name: RouteName) => void }) {
  const { settings, orders } = useAppData();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="管理员后台" onBack={() => onNavigate("me")} />
        <p className="pt-24 text-center text-[13px] text-muted-foreground">需要管理员身份才能进入</p>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        title="管理员后台"
        subtitle={settings?.familyName ?? ""}
        onBack={() => onNavigate("me")}
      />

      <div className="px-4 pt-[60px]">
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition-all",
                  tab === t.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-[18px] w-[18px]" />
                  {t.key === "orders" && pendingCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {pendingCount}
                    </span>
                  )}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="pb-24 pt-4">
          {tab === "orders" && <OrdersPanel />}
          {tab === "dishes" && <DishesPanel />}
          {tab === "members" && <MembersPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>

      <button
        onClick={() => onNavigate("me")}
        className="glass-bar phone-shell fixed bottom-0 left-0 right-0 z-30 flex h-12 items-center justify-center gap-1 border-t text-[13px] font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回我的
      </button>

      <ForceChangePasswordDialog />
    </div>
  );
}
