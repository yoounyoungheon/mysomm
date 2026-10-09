import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./card";
import { cn } from "@/app/utils/style/helper";

export interface DisclosureCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** 브라우저 details의 open 상태로 동작하며 React 열림 상태를 만들지 않는다. */
export default function DisclosureCard({
  title,
  description,
  icon,
  children,
  disabled,
  className,
}: DisclosureCardProps) {
  const heading = (
    <>
      {icon ? (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-ink-card">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] text-ink-muted">
            {description}
          </span>
        ) : null}
      </span>
    </>
  );
  return (
    <Card
      className={cn(
        "rounded-[20px] border-white/70 bg-white/90 p-3.5 shadow-none",
        className,
      )}
    >
      {disabled ? (
        <div aria-disabled="true" className="flex min-h-11 items-center gap-3">
          {heading}
        </div>
      ) : (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            {heading}
            <ChevronDown
              aria-hidden
              className="h-4 w-4 shrink-0 text-ink-secondary transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="mt-3 rounded-[14px] bg-primary/[0.05] p-3 text-[13px] leading-relaxed text-ink-card">
            {children}
          </div>
        </details>
      )}
    </Card>
  );
}
