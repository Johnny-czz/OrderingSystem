import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, title, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/45 backdrop-blur-[2px]"
      />
      <div
        className={cn(
          "phone-shell relative w-full animate-slide-in rounded-t-3xl bg-card p-5 pb-6 shadow-2xl",
          "safe-bottom"
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-bold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
