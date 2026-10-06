import type { Metadata } from "next";
import WineListSelectPage from "@/app/feature/wine-list-select/ui/WineListSelectPage";
import PageHeader from "@/app/shared/ui/molecule/page-header";

export const metadata: Metadata = {
  title: "와인 리스트 만들기 | WaMaDae",
};

export default function WineAiPage() {
  return (
    <div className="relative flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] flex-col overflow-hidden bg-canvas bg-violet-haze text-ink-page">
      <PageHeader title="와인 리스트 선택" navigation="home" variant="centered" />
      <WineListSelectPage />
    </div>
  );
}
