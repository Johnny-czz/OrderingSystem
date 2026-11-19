import { BookOpen, Heart, Star, User, UtensilsCrossed } from "lucide-react";
import type { RouteName } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  current: RouteName;
  onNavigate: (name: RouteName) => void;
  badge?: number;
}

const TABS: { name: RouteName; label: string; icon: typeof BookOpen }[] = [
  { name: "table", label: "今日餐桌", icon: UtensilsCrossed },
  { name: "menu", label: "菜谱", icon: BookOpen },
  { name: "fav", label: "收藏", icon: Star },
  { name: "wish", label: "心愿", icon: Heart },
  { name: "me", label: "我的", icon: User },
];

export function BottomTabBar({ current, onNavigate, badge = 0 }: Props) {
  return (
    <nav className="glass-bar phone-shell fixed bottom-0 left-0 right-0 z-40 border-t">
      <div className="safe-bottom flex items-stretch justify-around px-2 pt-1.5">
        {TABS.map((tab) => {
          const active = current === tab.name;
          const Icon = tab.icon;
          return (
            <button
              key={tab.name}
              onClick={() => onNavigate(tab.name)}
              className={cn(
                "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-transform duration-200",
                    active && "scale-110"
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {tab.name === "table" && badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className={cn("text-[11px] leading-none", active ? "font-semibold" : "font-medium")}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute -top-[1px] h-[3px] w-8 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
