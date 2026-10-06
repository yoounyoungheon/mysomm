import { cn } from "@/app/utils/style/helper";
import styles from "./wine-image-skeleton.module.css";

/** 고정 점 격자 위에 와인병 실루엣이 빛의 물결처럼 드러나는 장식용 placeholder. */
const dots = Array.from({ length: 24 * 41 }, (_, index) => {
  const column = index % 24;
  const row = Math.floor(index / 24);
  const x = 2 + column * 4;
  const y = 2 + row * 4;
  const distance = Math.abs(x - 48);
  const halfWidth =
    y < 16 || y > 146
      ? 0
      : y <= 22
        ? 7.5
        : y <= 42
          ? 6.5
          : y < 78
            ? 6.5 + 13 * (1 - Math.cos(((y - 42) / 36) * Math.PI)) / 2
            : y > 142
              ? 15.5 + Math.sqrt(Math.max(0, 16 - (y - 142) ** 2))
              : 19.5;
  return {
    x,
    y,
    isBottle: distance < halfWidth,
    delay: -(row * 0.043 + column * 0.017),
  };
});

export default function WineImageSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      data-wine-image-skeleton="true"
      aria-hidden="true"
      viewBox="0 0 96 164"
      className={cn("h-full w-full text-primary", className)}
    >
      {dots.map(({ x, y, isBottle, delay }) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={isBottle ? 0.95 : 0.4}
          fill="currentColor"
          opacity={isBottle ? undefined : 0.1}
          className={isBottle ? styles.dot : undefined}
          style={isBottle ? { animationDelay: `${delay}s` } : undefined}
        />
      ))}
    </svg>
  );
}
