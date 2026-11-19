import { useState } from "react";
import { KeyRound, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { Member } from "@/types";
import { useAppData } from "@/hooks/useAppData";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import { hashPassword, makeMember, randomSalt } from "@/lib/auth";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function MembersPanel() {
  const { members, upsertMember, removeMember, settings } = useAppData();
  const [editing, setEditing] = useState<Member | null>(null);
  const [draft, setDraft] = useState<Member | null>(null);
  const [pwd, setPwd] = useState("");

  const openNew = () => {
    const m = makeMember("", "member");
    setDraft(m);
    setEditing(m);
    setPwd("");
  };

  const openEdit = (m: Member) => {
    setDraft({ ...m });
    setEditing(m);
    setPwd("");
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("请填写昵称");
      return;
    }
    const patch: Member = { ...draft, name: draft.name.trim() };
    if (pwd.trim()) {
      const salt = randomSalt();
      patch.passwordSalt = salt;
      patch.passwordHash = await hashPassword(pwd.trim(), salt);
    }
    if (settings?.authMode === "password" && !patch.username?.trim()) {
      toast.error("当前是账号密码登录模式，必须设置账号");
      return;
    }
    await upsertMember(patch);
    toast.success("已保存");
    setEditing(null);
    setDraft(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <UsersRound className="h-4 w-4 text-primary" />
          <p className="text-[14px] font-bold">家庭成员（{members.length}）</p>
        </div>
        <Button onClick={openNew} size="sm" className="rounded-xl font-bold">
          <Plus className="h-3.5 w-3.5" />
          添加
        </Button>
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {settings?.authMode === "password"
          ? "当前为「账号密码登录」模式：家人需要你分配的账号密码才能进入。"
          : "当前为「免登录」模式：家人填昵称即可进入。你也可以提前设好账号，随时切换成密码登录。"}
      </p>

      <div className="mt-3 space-y-1.5">
        {members.map((m) => (
          <div key={m._id} className="flex items-center gap-2.5 rounded-2xl border bg-card p-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-black text-white"
              style={{ backgroundColor: m.color }}
            >
              {m.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13.5px] font-semibold">{m.name}</p>
                {m.role === "admin" && (
                  <span className="rounded bg-primary/12 px-1 py-[1px] text-[10px] font-bold text-primary">
                    管理员
                  </span>
                )}
                {!m.active && (
                  <span className="rounded bg-muted px-1 py-[1px] text-[10px] text-muted-foreground">
                    已停用
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {m.username ? (
                  <span className="flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    {m.username}
                  </span>
                ) : (
                  "未设置账号"
                )}
              </p>
            </div>
            <button
              onClick={() => openEdit(m)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={async () => {
                await removeMember(m._id as string);
                toast.success(`已移除 ${m.name}`);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <BottomSheet
        open={Boolean(editing && draft)}
        title={editing?._id && members.some((m) => m._id === editing?._id) ? "编辑成员" : "添加成员"}
        onClose={() => {
          setEditing(null);
          setDraft(null);
        }}
      >
        {draft && (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[12px] font-semibold">昵称</p>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="比如：妈妈"
                className={inputCls}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold">登录账号（可选）</p>
              <input
                value={draft.username ?? ""}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                placeholder="拼音或手机号都行"
                className={inputCls}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold">
                登录密码{editing?._id ? "（留空表示不修改）" : ""}
              </p>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="给家人设一个好记的密码"
                className={inputCls}
              />
            </div>
            <button
              onClick={() => setDraft({ ...draft, active: !draft.active })}
              className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[13px] font-semibold"
            >
              允许进入
              <span
                className={cn(
                  "h-6 w-11 rounded-full p-0.5 transition-colors",
                  draft.active ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "block h-5 w-5 rounded-full bg-white transition-transform",
                    draft.active && "translate-x-5"
                  )}
                />
              </span>
            </button>
            <Button onClick={save} className="h-12 w-full rounded-2xl text-[15px] font-bold">
              保存
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
