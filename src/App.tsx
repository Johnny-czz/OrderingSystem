import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { ChefHat } from "lucide-react";
import type { Route } from "@/types";
import { AppDataProvider, useAppData } from "@/hooks/useAppData";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { EnterPage } from "@/pages/EnterPage";
import { TablePage } from "@/pages/TablePage";
import { MenuPage } from "@/pages/MenuPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { DishDetailPage } from "@/pages/DishDetailPage";
import { WishPage } from "@/pages/WishPage";
import { MePage } from "@/pages/MePage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { BottomTabBar } from "@/components/BottomTabBar";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <span className="flex h-14 w-14 animate-pop items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <ChefHat className="h-7 w-7" />
      </span>
      <p className="text-[13px] font-medium text-muted-foreground">正在准备菜谱…</p>
    </div>
  );
}

function Shell() {
  const { identity, isAdmin } = useAuth();
  const { ready, orders, setFavoriteMember } = useAppData();
  const [route, setRoute] = useState<Route>({ name: "table" });

  useEffect(() => {
    if (identity?.memberId) setFavoriteMember(identity.memberId);
  }, [identity?.memberId, setFavoriteMember]);

  if (!ready) return <LoadingScreen />;
  if (!identity) return <EnterPage />;

  const go = (name: Route["name"]) => setRoute({ name });
  const totalQty = orders.reduce((s, o) => s + o.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      {route.name === "table" && (
        <TablePage
          onOpenDish={(dishId) => setRoute({ name: "dish", dishId })}
        />
      )}
      {route.name === "menu" && (
        <MenuPage onOpenDish={(dishId) => setRoute({ name: "dish", dishId })} />
      )}
      {route.name === "fav" && (
        <FavoritesPage onOpenDish={(dishId) => setRoute({ name: "dish", dishId })} />
      )}
      {route.name === "dish" && (
        <DishDetailPage dishId={route.dishId ?? ""} onBack={() => go("menu")} />
      )}
      {route.name === "wish" && <WishPage />}
      {route.name === "me" && (
        <MePage
          onNavigate={go}
          onOpenDish={(dishId) => setRoute({ name: "dish", dishId })}
        />
      )}
      {route.name === "admin" && <AdminPage onNavigate={go} />}

      {route.name !== "admin" && route.name !== "dish" && (
        <BottomTabBar current={route.name} onNavigate={go} badge={totalQty} />
      )}

      {isAdmin && route.name !== "admin" && (
        <button
          onClick={() => go("admin")}
          className="phone-shell fixed right-0 top-[58px] z-20 mr-3 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-[0_6px_16px_-6px_rgba(228,87,46,.9)] transition-transform active:scale-95"
        >
          后台
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <AuthProvider>
        <Shell />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </AppDataProvider>
  );
}
