import { useRef, useState } from "react";
import { ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Category, Dish } from "@/types";
import { CATEGORIES } from "@/types";
import { useAppData } from "@/hooks/useAppData";
import { BottomSheet } from "@/components/BottomSheet";
import { PlaceholderCover } from "@/components/PlaceholderCover";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/image";
import { cn } from "@/lib/utils";

const EMPTY: Dish = {
  name: "",
  category: "荤菜",
  desc: "",
  coverUrl: "",
  source: "",
  ingredients: [],
  steps: [],
  tags: [],
  spicyLevel: 0,
  available: true,
  sort: 999,
  createdAt: 0,
};

export function DishesPanel() {
  const { dishes, upsertDish, removeDish } = useAppData();
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Dish | null>(null);
  const [draft, setDraft] = useState<Dish>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = dishes.filter(
    (d) => !keyword.trim() || d.name.includes(keyword.trim()) || d.desc.includes(keyword.trim())
  );

  const openNew = () => {
    setDraft({ ...EMPTY, createdAt: Date.now() });
    setEditing({ ...EMPTY, createdAt: Date.now() });
  };

  const openEdit = (d: Dish) => {
    setDraft({ ...d });
    setEditing(d);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("菜名不能为空");
      return;
    }
    await upsertDish({
      ...draft,
      name: draft.name.trim(),
      ingredients: draft.ingredients.filter((i) => i.trim()),
      steps: draft.steps.filter((s) => s.trim()),
      tags: draft.tags.filter((t) => t.trim()),
    });
    toast.success(editing?._id ? "已保存修改" : "已新增菜品");
    setEditing(null);
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setDraft((d) => ({ ...d, coverUrl: url }));
      toast.success("图片已上传");
    } catch (error) {
      console.error(error);
      toast.error("图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索菜名"
            className="h-11 w-full rounded-2xl border border-input bg-card pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button onClick={openNew} className="h-11 shrink-0 rounded-2xl px-4 font-bold">
          <Plus className="h-4 w-4" />
          新增
        </Button>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">共 {dishes.length} 道菜</p>

      <div className="mt-2 space-y-1.5">
        {list.map((d) => (
          <div key={d._id} className="flex items-center gap-2.5 rounded-2xl border bg-card p-2.5">
            <PlaceholderCover
              name={d.name}
              coverUrl={d.coverUrl}
              className="h-11 w-11 rounded-lg"
              fontSize="text-base"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13.5px] font-semibold">{d.name}</p>
                {!d.available && (
                  <span className="rounded bg-muted px-1 py-[1px] text-[10px] text-muted-foreground">
                    已下架
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {d.category} · {d.ingredients.length} 种食材 · {d.steps.length} 步
                {d.source ? ` · ${d.source}` : ""}
              </p>
            </div>
            <button
              onClick={() => openEdit(d)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={async () => {
                await removeDish(d._id as string);
                toast.success(`已删除 ${d.name}`);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <BottomSheet
        open={Boolean(editing)}
        title={editing?._id ? "编辑菜品" : "新增菜品"}
        onClose={() => setEditing(null)}
      >
        <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-0.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative shrink-0"
              disabled={uploading}
            >
              <PlaceholderCover
                name={draft.name || "新菜"}
                coverUrl={draft.coverUrl}
                className="h-16 w-16 rounded-xl"
              />
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ImagePlus className="h-3 w-3" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold">菜品图片</p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {uploading ? "上传中…" : "点击上传，不传就自动生成渐变封面"}
              </p>
            </div>
          </div>

          <Field label="菜名">
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="比如：蒜香排骨"
              className={inputCls}
            />
          </Field>

          <Field label="分类">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c: Category) => (
                <button
                  key={c}
                  onClick={() => setDraft((d) => ({ ...d, category: c }))}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
                    draft.category === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <Field label="一句话简介">
            <input
              value={draft.desc}
              onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))}
              placeholder="外酥里嫩，孩子最爱"
              className={inputCls}
            />
          </Field>

          <Field label="来源作者（可选）">
            <input
              value={draft.source ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
              placeholder="如：村驴 / 隋坡，留空表示家常菜"
              className={inputCls}
            />
          </Field>

          <Field label={`食材（每行一个）· ${draft.ingredients.length} 项`}>
            <textarea
              value={draft.ingredients.join("\n")}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ingredients: e.target.value.split("\n") }))
              }
              rows={4}
              placeholder={"排骨 500g\n蒜末 3勺"}
              className={cn(inputCls, "h-auto py-2 leading-relaxed")}
            />
          </Field>

          <Field label={`做法步骤（每行一步）· ${draft.steps.length} 步`}>
            <textarea
              value={draft.steps.join("\n")}
              onChange={(e) => setDraft((d) => ({ ...d, steps: e.target.value.split("\n") }))}
              rows={5}
              placeholder={"排骨焯水洗净\n热油爆香蒜末"}
              className={cn(inputCls, "h-auto py-2 leading-relaxed")}
            />
          </Field>

          <Field label="标签（逗号分隔）">
            <input
              value={draft.tags.join("，")}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  tags: e.target.value.split(/[，,]/).map((t) => t.trim()),
                }))
              }
              placeholder="快手，下饭"
              className={inputCls}
            />
          </Field>

          <Field label="辣度">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((lv) => (
                <button
                  key={lv}
                  onClick={() => setDraft((d) => ({ ...d, spicyLevel: lv as Dish["spicyLevel"] }))}
                  className={cn(
                    "h-8 flex-1 rounded-lg text-[12px] font-semibold transition-all",
                    draft.spicyLevel === lv
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {["不辣", "微辣", "中辣", "特辣"][lv]}
                </button>
              ))}
            </div>
          </Field>

          <button
            onClick={() => setDraft((d) => ({ ...d, available: !d.available }))}
            className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[13px] font-semibold"
          >
            上架（可点）
            <span
              className={cn(
                "h-6 w-11 rounded-full p-0.5 transition-colors",
                draft.available ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "block h-5 w-5 rounded-full bg-white transition-transform",
                  draft.available && "translate-x-5"
                )}
              />
            </span>
          </button>
        </div>

        <Button onClick={save} className="mt-4 h-12 w-full rounded-2xl text-[15px] font-bold">
          保存
        </Button>
      </BottomSheet>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold">{label}</p>
      {children}
    </div>
  );
}
