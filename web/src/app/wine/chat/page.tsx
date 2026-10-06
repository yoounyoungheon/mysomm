import type { Metadata } from "next";
import WinePairingChatView from "@/app/feature/wine-pairing-chat/ui/WinePairingChatView";
import PageHeader from "@/app/shared/ui/molecule/page-header";

export const metadata: Metadata = {
  title: "와인 추천 | WaMaDae",
};

/**
 * 와인 페어링 스트리밍 대화 라우트.
 *
 * 페어링 요청은 `/wine/keywords`의 "와인 추천받기" 버튼이 sessionStorage에 스냅샷하며,
 * 이 화면의 Client 뷰가 스냅샷을 읽어 SSE 페어링/후속 채팅을 수행한다.
 */
export default function WineChatPage() {
  return (
    <div className="flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] flex-col overflow-hidden bg-canvas bg-violet-haze text-ink-page">
      <PageHeader title="와인 추천" navigation="home" variant="centered" />
      <WinePairingChatView />
    </div>
  );
}
