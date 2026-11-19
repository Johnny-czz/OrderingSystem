import { useState } from "react";
import { Copy, Globe, Lock, ShieldCheck, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/BottomSheet";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function SettingsPanel() {
  const { settings, updateSettings, mode, round } = useAppData();
  const { changeAdminPassword } = useAuth();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [familyName, setFamilyName] = useState(settings?.familyName ?? "");
  const [notice, setNotice] = useState(settings?.notice ?? "");

  if (!settings) return null;

  return (
    <div className="space-y-3">
      <section className="card-shadow rounded-2xl bg-card p-4">
        <p className="text-[14px] font-bold">家庭信息</p>
        <p className="mt-1.5 text-[12px] font-semibold">家庭名称</p>
        <input
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className={cn(inputCls, "mt-1")}
        />
        <p className="mt-2.5 text-[12px] font-semibold">首页公告</p>
        <input
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="今天想吃什么？点完我来做～"
          className={cn(inputCls, "mt-1")}
        />
        <Button
          onClick={async () => {
            await updateSettings({ familyName: familyName.trim() || "我家小厨房", notice });
            toast.success("已保存");
          }}
          className="mt-3 h-10 w-full rounded-xl font-bold"
        >
          保存家庭信息
        </Button>
      </section>

      <section className="card-shadow rounded-2xl bg-card p-4">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-[14px] font-bold">访问控制</p>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          决定家人打开链接后怎么进入：填个昵称就行，还是必须用你分配的账号密码。
        </p>
        <div className="mt-3 flex gap-1 rounded-full bg-muted p-1">
          <button
            onClick={() => updateSettings({ authMode: "guest" })}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1 rounded-full text-[13px] font-semibold transition-all",
              settings.authMode === "guest"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <Unlock className="h-3.5 w-3.5" />
            免登录
          </button>
          <button
            onClick={() => updateSettings({ authMode: "password" })}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1 rounded-full text-[13px] font-semibold transition-all",
              settings.authMode === "password"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            账号密码
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {settings.authMode === "password"
            ? "切换到密码登录后，需要在「成员账号」里给每个家人设置账号和密码。"
            : "免登录模式下把链接发给家人，填昵称就能点餐。"}
        </p>
        <Button
          onClick={() => setPwdOpen(true)}
          variant="outline"
          className="mt-3 h-10 w-full rounded-xl font-bold"
        >
          修改管理员密码
        </Button>
        {settings.adminMustChangePassword && (
          <p className="mt-2 text-center text-[11px] font-semibold text-destructive">
            当前仍是初始密码 123456，建议尽快修改
          </p>
        )}
      </section>

      <section className="card-shadow rounded-2xl bg-card p-4">
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-primary" />
          <p className="text-[14px] font-bold">分享与数据</p>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          当前数据存储在：
          {mode === "cloud"
            ? "腾讯云开发 CloudBase（全家实时同步）"
            : "本机浏览器演示数据（未配置 CloudBase，家人之间还看不到彼此的点餐）"}
        </p>
        <Button
          onClick={async () => {
            const url = window.location.href;
            try {
              await navigator.clipboard.writeText(url);
              toast.success("链接已复制，发给家人吧");
            } catch (error) {
              console.error(error);
              toast.error("复制失败，请手动复制地址栏链接");
            }
          }}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl font-bold"
        >
          <Copy className="h-3.5 w-3.5" />
          复制分享链接
        </Button>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          今日餐桌状态：{round ? "进行中" : "已结束"}。结束餐桌后会自动归档到历史记录。
        </p>
      </section>

      <BottomSheet open={pwdOpen} title="修改管理员密码" onClose={() => setPwdOpen(false)}>
        <div className="space-y-3">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="新密码（至少 4 位）"
            className={inputCls}
          />
          <input
            type="password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder="再输入一次新密码"
            className={inputCls}
          />
          <Button
            onClick={async () => {
              if (pwd.trim().length < 4) {
                toast.error("密码至少 4 位");
                return;
              }
              if (pwd !== pwd2) {
                toast.error("两次输入不一致");
                return;
              }
              const patch = await changeAdminPassword(pwd.trim());
              await updateSettings(patch);
              setPwd("");
              setPwd2("");
              setPwdOpen(false);
              toast.success("管理员密码已更新");
            }}
            className="h-12 w-full rounded-2xl text-[15px] font-bold"
          >
            确认修改
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
