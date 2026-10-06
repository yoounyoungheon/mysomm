import type { Metadata } from "next";
import MenuCategoryRecommendationPage from "@/app/feature/menu-category-recommendation-result/ui/MenuCategoryRecommendationPage";
import PageHeader from "@/app/shared/ui/molecule/page-header";

export const metadata: Metadata = {
  title: "추천 메뉴 | WaMaDae",
};

/**
 * 추천 메뉴 결과 라우트.
 *
 * 추천은 이전 단계에서 유지된 선택 와인으로 동기 API를 호출해 결과 화면에서 수행한다.
 * 선택 상태는 `/wine/layout.tsx`의 `WineListSelectionProvider`가 형제 라우트 간에 유지한다.
 */
export default function WineKeywordsPage() {
  return (
    <div className="flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] flex-col overflow-hidden bg-canvas bg-violet-haze text-ink-page">
      <PageHeader title="추천 메뉴" navigation="home" variant="centered" />
      <MenuCategoryRecommendationPage />
    </div>
  );
}
