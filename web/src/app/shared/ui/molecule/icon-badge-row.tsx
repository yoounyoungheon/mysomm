import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/app/utils/style/helper";

export interface IconBadgeRowProps {
  iconSrc: string;
  label: string;
  children: ReactNode;
  className?: string;
}

/** 첫 줄 및 줄바꿈된 뱃지를 동일한 시작점에 배치한다. */
export default function IconBadgeRow({
  iconSrc,
  label,
  children,
  className,
}: IconBadgeRowProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3",
        className,
      )}
    >
      <Image
        src={iconSrc}
        alt=""
        width={32}
        height={32}
        className="mt-1.5 h-8 w-8 object-contain"
      />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}
