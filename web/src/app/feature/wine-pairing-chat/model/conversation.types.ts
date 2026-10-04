import type {
  PairingFieldName,
  PairingSlidePayload,
  PairingStreamWine,
} from "@/app/entity/wine-pairing/model/wine-pairing.type";

/**
 * 캐러셀 슬라이드의 화면 모델.
 * 스트리밍 중에는 필드가 점진적으로 채워지고(`isCommitted: false`),
 * `JSON` 프레임에서 최종 payload로 replace되며 `isCommitted: true`가 된다.
 */
export type PairingSlideView = {
  imageUrl: string;
  rank: string;
  name: string;
  comment: string;
  reason: string;
  wine: PairingStreamWine | null;
  isCommitted: boolean;
};

export type PairingTurn = {
  kind: "pairing";
  source: "initial" | "recommendation";
  question?: string;
  slides: PairingSlideView[];
  status: "streaming" | "done" | "error";
  errorMessage?: string;
};

export type ChatTurn = {
  kind: "chat";
  question: string;
  answer: string;
  status: "streaming" | "done" | "error";
  errorMessage?: string;
};

export type ConversationTurn = PairingTurn | ChatTurn;

export type ConversationState = {
  turns: ConversationTurn[];
  pairing: "idle" | "streaming" | "done" | "error";
  chat: "idle" | "streaming" | "error";
  /** 확정(JSON)된 pairing slide 총 개수. 최초 pairing 완료/composer 활성 판단에 쓴다. */
  committedPairingCount: number;
  errorMessage?: string;
};

export type ConversationAction =
  | { type: "PRESENTATION_BATCH"; actions: ConversationAction[] }
  | { type: "PAIRING_START" }
  | { type: "RECOMMENDATION_START"; question: string }
  | {
      type: "PAIRING_SLIDE_FIELD";
      field: PairingFieldName;
      data: string;
    }
  | { type: "PAIRING_SLIDE_COMMIT"; payload: PairingSlidePayload }
  | { type: "PAIRING_DONE" }
  | { type: "PAIRING_ERROR"; message: string }
  | { type: "CHAT_START"; question: string }
  | { type: "CHAT_APPEND"; chunk: string }
  | { type: "CHAT_DONE" }
  | { type: "CHAT_ERROR"; message: string }
  | { type: "RESET" };
