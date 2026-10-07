/**
 * 와인 페어링 워크플로의 페이지 간 handoff snapshot 계약.
 *
 * 모든 snapshot은 같은 `X-Session-Id`(UUID)를 공유하며 versioned 객체로 저장한다.
 * legacy(비 versioned) shape은 묵시적으로 변환하지 않고 invalid로 처리한다.
 */
export const WORKFLOW_SNAPSHOT_VERSION = 2 as const;

/**
 * `/wine/list` → `/wine/keywords` handoff.
 * 추출 세션과 사용자가 선택한 pairing 대상 wine ID를 담는다.
 */
export type WineSelectionSnapshot = {
  version: typeof WORKFLOW_SNAPSHOT_VERSION;
  sessionId: string;
  pairingWineIds: string[];
};

/**
 * `/wine/keywords` → `/wine/chat` handoff.
 * 같은 세션의 선택 wine ID와 추천·고정·직접 입력에서 고른 음식명을 담는다.
 */
export type WinePairingSnapshot = {
  version: typeof WORKFLOW_SNAPSHOT_VERSION;
  sessionId: string;
  wineIds: string[];
  menuNames: string[];
};
