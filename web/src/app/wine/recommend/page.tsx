import type { Metadata } from "next";
import WinePairingChatView from "@/app/feature/wine-pairing-chat/ui/WinePairingChatView";
import PageHeader from "@/app/shared/ui/molecule/page-header";

export const metadata: Metadata = { title: "와인 추천 | 마이쏨" };

/** 기존 대화/서버 상태 로직을 공유하고 추천 UI만 B로 지정한다. */
export default function WineRecommendPage() {
  return (
    <div className="flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] flex-col overflow-hidden bg-canvas bg-violet-haze text-ink-page">
      <PageHeader title="와인 추천" navigation="home" variant="centered" />
      <WinePairingChatView recommendationVariant="B" />
    </div>
  );
}
