import { cn } from "@/lib/utils";
import { gradientFor } from "@/lib/utils";

interface Props {
  name: string;
  coverUrl?: string;
  className?: string;
  fontSize?: string;
}

/** 菜品封面：有图显示图，无图用菜名首字 + 暖色渐变占位 */
export function PlaceholderCover({ name, coverUrl, className, fontSize }: Props) {
  const { from, to } = gradientFor(name);
  const first = (name ?? "菜").trim().slice(0, 1);

  if (coverUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <img src={coverUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden font-bold text-white/95 select-none",
        className
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="absolute -right-3 -top-4 h-14 w-14 rounded-full bg-white/15 blur-[1px]" />
      <span className="absolute -bottom-5 -left-3 h-16 w-16 rounded-full bg-black/10" />
      <span
        className={cn("relative drop-shadow-sm", fontSize ?? "text-2xl")}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,.22)" }}
      >
        {first}
      </span>
    </div>
  );
}
