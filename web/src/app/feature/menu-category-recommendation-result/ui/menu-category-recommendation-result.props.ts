import type { RecommendedMenu } from "@/app/entity/menu-category-recommendation/model/menu-category-recommendation.type";

export interface MenuCategoryRecommendationPageProps {
  className?: string;
}

export interface RecommendedMenuListProps {
  menus: RecommendedMenu[];
  /** 선택된 메뉴 `name` 목록. category가 아니라 name이 선택 식별자다. */
  selectedNames?: readonly string[];
  onToggleName?: (name: string) => void;
  className?: string;
}

export interface MenuNameBadgeProps {
  name: string;
  iconSrc?: string;
  isSelected?: boolean;
  onToggle?: (name: string) => void;
  onRemove?: (name: string) => void;
  className?: string;
}
