import Skeleton from "@/app/shared/ui/atom/skeleton";
import WineImageSkeleton from "@/app/shared/ui/atom/wine-image-skeleton";
import { cn } from "@/app/utils/style/helper";

export interface SkeletonListProps {
  /** 보조 기술에 전달할 로딩 안내 문구. */
  label: string;
  className?: string;
  variant?: "menu" | "menu-rows" | "menu-chips" | "wine";
}

/** 메뉴 카테고리 카드 또는 와인 생성 이미지를 보여주는 공용 로딩 패널. */
export default function SkeletonList({
  label,
  className,
  variant = "menu",
}: SkeletonListProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-skeleton-variant={variant}
      className={cn(
        variant === "menu-chips"
          ? "grid w-full grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4"
          : variant === "menu-rows"
            ? "w-full space-y-4"
            : "w-full space-y-3 rounded-[20px] border border-white/70 bg-white/40 p-4",
        className,
      )}
    >
      {variant === "wine" ? (
        <div className="flex items-center gap-5 py-2">
          <WineImageSkeleton className="h-[160px] w-[88px] shrink-0" />
          <div className="min-w-0 flex-1 space-y-4">
            <p className="text-[13px] font-medium leading-relaxed text-ink-secondary">
              {label}
            </p>
            <Skeleton className="h-2.5 w-4/5 rounded-full" />
            <Skeleton className="h-2 w-full rounded-full bg-primary/[0.08]" />
            <Skeleton className="h-2 w-3/5 rounded-full bg-primary/[0.08]" />
          </div>
        </div>
      ) : variant === "menu-chips" ? (
        <>
          <span className="sr-only">{label}</span>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              aria-hidden="true"
              className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-full border border-white/60 bg-white/[0.12] px-3 py-2"
            >
              <Skeleton
                className="h-[18px] w-[18px] shrink-0 rounded-full"
                style={{ animationDelay: `${index * 100}ms` }}
              />
              <Skeleton className="h-2 min-w-0 flex-1 rounded-full bg-primary/[0.08]" />
            </div>
          ))}
        </>
      ) : variant === "menu-rows" ? (
        <>
          <span className="sr-only">{label}</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              aria-hidden="true"
              className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3"
            >
              <Skeleton
                className="mt-1.5 h-8 w-8 rounded-full"
                style={{ animationDelay: `${index * 140}ms` }}
              />
              <div className="flex min-w-0 flex-wrap gap-2">
                <Skeleton className="h-11 w-2/5 rounded-full bg-primary/[0.14]" />
                <Skeleton className="h-11 w-1/3 rounded-full bg-primary/[0.08]" />
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <span className="sr-only">{label}</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              aria-hidden="true"
              className="space-y-3 rounded-[16px] border border-white/75 bg-white/50 p-4"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton
                  className="h-6 w-6 rounded-full"
                  style={{ animationDelay: `${index * 140}ms` }}
                />
                <Skeleton className="h-2.5 w-1/3 rounded-full bg-primary/[0.14]" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-2/5 rounded-full bg-primary/[0.08]" />
                <Skeleton className="h-8 w-1/3 rounded-full bg-primary/[0.08]" />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
