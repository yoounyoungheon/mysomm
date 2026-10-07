import Image from "next/image";
import SelectionBadge from "@/app/shared/ui/atom/selection-badge";
import type { MenuNameBadgeProps } from "./menu-category-recommendation-result.props";

/**
 * 추천 메뉴 name 선택 배지.
 * 선택 식별자는 `name`이며, 탭으로 선택을 토글한다.
 */
export default function MenuNameBadge({
  name,
  iconSrc,
  isSelected = false,
  onToggle,
  onRemove,
  className,
}: MenuNameBadgeProps) {
  return (
    <SelectionBadge
      label={name}
      icon={
        iconSrc ? (
          <Image
            src={iconSrc}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain"
          />
        ) : undefined
      }
      selected={isSelected}
      onToggle={() => onToggle?.(name)}
      onRemove={onRemove ? () => onRemove(name) : undefined}
      className={className}
    />
  );
}
