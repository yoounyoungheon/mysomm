import { groupRecommendedMenusByCategory } from "@/app/entity/menu-category-recommendation/lib/group-recommended-menus";
import { MENU_CATEGORY_ICON } from "@/app/entity/menu-category-recommendation/model/menu-category-recommendation.type";
import { cn } from "@/app/utils/style/helper";
import MenuNameBadge from "./MenuNameBadge";
import type { RecommendedMenuListProps } from "./menu-category-recommendation-result.props";

/**
 * 각 뱃지 내부에 작은 category 아이콘을 표시하고 내용 너비에 따라 줄바꿈한다.
 * category/메뉴 순서는 응답(AI rank) 순서를 유지하고, 배지는 name으로 선택을 토글한다.
 */
export default function RecommendedMenuList({
  menus,
  selectedNames = [],
  onToggleName,
  className,
}: RecommendedMenuListProps) {
  const selectedSet = new Set(selectedNames);
  const groups = groupRecommendedMenusByCategory(menus);

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {groups.flatMap((group) =>
        group.menus.map((menu, index) => (
          <li
            key={`${group.category}-${menu.name}-${index}`}
            className="min-w-0 max-w-full"
          >
            <MenuNameBadge
              name={menu.name}
              iconSrc={MENU_CATEGORY_ICON[group.category]}
              isSelected={selectedSet.has(menu.name)}
              onToggle={onToggleName}
              className="max-w-full"
            />
          </li>
        )),
      )}
    </ul>
  );
}
