import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function ForceChangePasswordDialog() {
  const { settings, updateSettings } = useAppData();
  const { isAdmin, changeAdminPassword } = useAuth();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const visible = isAdmin && settings?.adminMustChangePassword && !dismissed;
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="phone-shell card-shadow relative w-full animate-pop rounded-3xl bg-card p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h3 className="mt-3 text-[17px] font-bold">请先修改管理员密码</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          当前使用的是初始密码 123456。改一个只有你知道的密码，再继续使用后台。
        </p>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="新密码（至少 4 位）"
          className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          placeholder="再输入一次"
          className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
            toast.success("密码已更新");
            setDismissed(true);
          }}
          className="mt-4 h-12 w-full rounded-2xl text-[15px] font-bold"
        >
          确认修改
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="mt-2.5 w-full text-center text-[12px] text-muted-foreground"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
