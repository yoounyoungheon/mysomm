import type { ComponentProps } from "react";
import { cn } from "@/app/utils/style/helper";

/** 장식용 로딩 블록. 크기는 소비자가 지정하고 의미·상태 안내는 부모에서 제공한다. */
export default function Skeleton({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-[8px] bg-primary/[0.12] motion-reduce:animate-none",
        className
      )}
    />
  );
}
