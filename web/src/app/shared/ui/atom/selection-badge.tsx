import { X } from "lucide-react";
import type { ReactNode } from "react";
import Button from "./button";
import { cn } from "@/app/utils/style/helper";

export interface SelectionBadgeProps {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  className?: string;
}

/** 선택과 삭제가 각각 독립된 버튼인 공통 뱃지. */
export default function SelectionBadge({
  label,
  icon,
  selected = false,
  onToggle,
  onRemove,
  className,
}: SelectionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center rounded-full border backdrop-blur-xl transition-colors",
        selected
          ? "border-primary/55 bg-primary/[0.16] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
          : "border-white/60 bg-white/[0.12] text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        className,
      )}
    >
      <Button
        htmlType="button"
        variant="text"
        radius="full"
        aria-pressed={selected}
        onClick={onToggle}
        className="h-auto min-h-11 min-w-0 flex-1 gap-1.5 whitespace-normal break-words bg-transparent px-3 py-2 text-left text-[13px] font-bold leading-relaxed text-inherit shadow-none hover:bg-white/[0.12] [overflow-wrap:anywhere]"
      >
        {icon ? (
          <span aria-hidden="true" className="flex shrink-0 items-center">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0">{label}</span>
      </Button>
      {onRemove ? (
        <Button
          htmlType="button"
          variant="text"
          size="icon"
          radius="full"
          aria-label={`${label} 삭제`}
          onClick={onRemove}
          className="h-11 w-11 shrink-0 bg-transparent text-inherit shadow-none hover:bg-white/[0.12]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </span>
  );
}
