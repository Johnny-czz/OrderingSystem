import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  transparent?: boolean;
}

export function TopBar({ title, subtitle, onBack, right, transparent }: Props) {
  return (
    <header
      className={cn(
        "glass-bar phone-shell fixed left-0 right-0 top-0 z-30 border-b",
        transparent && "border-transparent bg-transparent backdrop-blur-0"
      )}
    >
      <div className="safe-top flex h-[52px] items-center gap-2 px-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
