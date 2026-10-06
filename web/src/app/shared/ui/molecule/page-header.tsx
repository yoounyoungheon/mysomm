import { ArrowLeft, House } from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/utils/style/helper";

export interface PageHeaderProps {
  title: string;
  routeBackPath?: string;
  navigation?: "back" | "home";
  variant?: "default" | "centered";
  className?: string;
}

export default function PageHeader({
  title,
  routeBackPath,
  navigation = "back",
  variant = "default",
  className,
}: PageHeaderProps) {
  const isCentered = variant === "centered";
  const destination = navigation === "home" ? "/" : routeBackPath;
  const NavigationIcon = navigation === "home" ? House : ArrowLeft;

  return (
    <header
      className={cn(
        "relative flex shrink-0 items-center",
        isCentered
          ? "h-[72px] justify-center bg-transparent px-5"
          : "h-[50px] border-b border-main-light-gray-600 bg-white px-4",
        className,
      )}
    >
      {destination ? (
        <Link
          href={destination}
          replace={navigation === "home"}
          aria-label={navigation === "home" ? "홈으로 이동" : "뒤로가기"}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full transition-colors",
            isCentered
              ? "absolute left-5 h-11 w-11 border border-white/70 bg-white/[0.12] text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(110,58,245,0.08),0_10px_28px_rgba(72,52,112,0.08)] backdrop-blur-xl backdrop-saturate-150 hover:bg-white/[0.2]"
              : "h-9 w-9 text-text-02 hover:bg-main-light-gray-300",
          )}
        >
          <NavigationIcon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </Link>
      ) : null}
      <h1
        className={cn(
          "truncate font-bold leading-none",
          isCentered
            ? "max-w-[calc(100%_-_112px)] text-[16px] text-ink-page"
            : "text-[20px] text-text-02",
          destination && !isCentered && "ml-2",
        )}
      >
        {title}
      </h1>
    </header>
  );
}
