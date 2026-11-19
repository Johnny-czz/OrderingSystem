import { useState } from "react";
import { ArrowRight, ChefHat, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/BottomSheet";
import { gradientFor } from "@/lib/utils";

export function EnterPage() {
  const { settings, mode, error, ready } = useAppData();
  const { enterAsGuest, loginMember, loginAdmin } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPwd, setAdminPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [bump, setBump] = useState(0);

  const { from, to } = gradientFor(settings?.familyName ?? "家");

  const submitGuest = async () => {
    if (!name.trim()) {
      toast.error("先告诉我你的昵称吧");
      return;
    }
    setLoading(true);
    try {
      await enterAsGuest(name);
      toast.success(`欢迎，${name.trim()}！`);
    } catch (e) {
      console.error(e);
      toast.error("进入失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async () => {
    if (!username.trim() || !password) {
      toast.error("请填写账号和密码");
      return;
    }
    setLoading(true);
    try {
      const ok = await loginMember(username, password);
      if (!ok) toast.error("账号或密码不对，问问管理员～");
      else toast.success(`欢迎回来，${username.trim()}！`);
    } finally {
      setLoading(false);
    }
  };

  const submitAdmin = async () => {
    setLoading(true);
    try {
      const ok = await loginAdmin(adminUser, adminPwd);
      if (!ok) {
        toast.error("管理员账号或密码不正确");
        return;
      }
      setAdminOpen(false);
      toast.success("管理员已登录");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        key={bump}
        className="animate-fade-up relative overflow-hidden px-6 pb-10 pt-16"
        style={{ backgroundImage: `linear-gradient(150deg, ${from}, ${to})` }}
      >
        <span className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-white/15" />
        <span className="pointer-events-none absolute -bottom-16 -right-8 h-44 w-44 rounded-full bg-black/10" />
        <div className="relative flex items-center gap-2 text-white/90">
          <ChefHat className="h-6 w-6" />
          <span className="text-[13px] font-medium tracking-wide">家庭点餐</span>
        </div>
        <h1 className="relative mt-3 text-[30px] font-black leading-tight text-white drop-shadow-sm">
          {settings?.familyName ?? "我家小厨房"}
        </h1>
        <p className="relative mt-2 max-w-[80%] text-[13px] leading-relaxed text-white/90">
          {settings?.notice ?? "今天想吃什么？点完我来做～"}
        </p>
        <button
          onClick={() => setBump((b) => b + 1)}
          className="relative mt-5 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur"
        >
          换个氛围色
        </button>
      </div>

      <div className="-mt-6 flex-1 rounded-t-3xl bg-background px-5 pb-10 pt-6">
        {!ready && <p className="text-center text-[13px] text-muted-foreground">正在准备数据…</p>}

        {error && (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/8 p-3 text-[12px] leading-relaxed text-destructive">
            数据连接失败：{error}
            <br />
            当前会继续使用本机演示数据。
          </div>
        )}

        {settings?.authMode === "password" ? (
          <div className="space-y-3">
            <label className="block text-[13px] font-semibold">账号</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="管理员给你分配的账号"
              className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <label className="block text-[13px] font-semibold">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitLogin()}
              placeholder="输入密码"
              className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button
              onClick={submitLogin}
              disabled={loading}
              className="h-12 w-full rounded-2xl text-[15px] font-bold"
            >
              登录点餐
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-[13px] font-semibold">你的昵称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGuest()}
              placeholder="比如：爸爸 / 小宝 / 老李"
              className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button
              onClick={submitGuest}
              disabled={loading}
              className="h-12 w-full rounded-2xl text-[15px] font-bold"
            >
              进入今日餐桌
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              免登录模式：填个昵称就能点餐，家里人一眼就知道是谁点的
            </p>
          </div>
        )}

        <button
          onClick={() => setAdminOpen(true)}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed py-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ShieldCheck className="h-4 w-4" />
          管理员入口（管菜谱 / 看订单）
        </button>

        <p className="mt-4 text-center text-[10px] text-muted-foreground/80">
          数据存储方式：{mode === "cloud" ? "腾讯云开发 CloudBase（全家实时同步）" : "本机演示数据（未配置 CloudBase）"}
        </p>
      </div>

      <BottomSheet open={adminOpen} title="管理员登录" onClose={() => setAdminOpen(false)}>
        <div className="space-y-3">
          <input
            value={adminUser}
            onChange={(e) => setAdminUser(e.target.value)}
            placeholder="管理员账号"
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            value={adminPwd}
            onChange={(e) => setAdminPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAdmin()}
            placeholder="管理员密码"
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button
            onClick={submitAdmin}
            disabled={loading}
            className="h-12 w-full rounded-2xl text-[15px] font-bold"
          >
            登录后台
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            初始账号 admin / 密码 123456，登录后请立即修改
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
