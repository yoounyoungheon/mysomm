import type { WineCurrency } from "@/app/entity/wine/model/wine.type";

/**
 * `POST /v1/wine-pairings/pairing` 요청 body.
 * `wineIds`는 추출 응답의 wine UUID, `menuNames`는 추천·고정·직접 입력에서 선택한 음식명이다.
 */
export type WinePairingRequest = {
  wineIds: string[];
  menuNames: string[];
};

/** `POST /v1/wine-pairings/chat` 요청 body. */
export type WinePairingChatRequest = {
  message: string;
};

export type PairingStreamWinePrice = {
  amount: number;
  currency: WineCurrency;
  currencySign: string;
  koreanUnit: string;
};

/**
 * 페어링 SSE `JSON` 프레임에 포함되는 와인 상세.
 * 공통 `Wine` 계약과 동일한 taste profile/병 이미지 필드를 포함한다.
 * 현재 backend mapper는 `body`를 누락하므로 `body`는 항상 null일 수 있다(정상 nullable).
 */
export type PairingStreamWine = {
  id: string;
  wineName: string;
  vintage: number | null;
  alcohol: string | null;
  price: PairingStreamWinePrice[] | null;
  country: string | null;
  region: string | null;
  tannin: number | null;
  body: number | null;
  sweetness: number | null;
  acid: number | null;
  wineBottleImageUrl: string | null;
  // 아래 필드는 현재 문서화된 계약에는 없는 optional 확장 필드다.
  // backend가 제공하면 상세 카드에 표시하고, 없으면 해당 섹션을 숨긴다.
  variety?: string | null;
  wineType?: string | null;
  aromas?: string[] | null;
};

/**
 * 페어링 스트림의 `JSON` 프레임 payload(추천 한 건의 최종 권위 데이터).
 */
export type PairingSlidePayload = {
  pairingId: string;
  rank: number;
  wine: PairingStreamWine;
  comment: string;
  reason: string;
};

export type PairingFieldName = "rank" | "name" | "comment" | "reason";

export type PairingFieldStreamData = {
  fieldName: PairingFieldName;
  hasNext: boolean;
  body: string;
};

export type ChatStreamData = {
  body: string;
};

/**
 * 페어링 SSE 프레임 DTO.
 * `STREAM`은 field 청크, `JSON`은 추천 한 건의 최종 payload다.
 */
export type PairingStreamEvent =
  | {
      type: "STREAM";
      data: PairingFieldStreamData;
    }
  | {
      type: "JSON";
      data: PairingSlidePayload;
    };

/** 일반 후속 채팅 SSE 프레임 DTO. field name 없는 답변 청크만 온다. */
export type ChatStreamEvent = {
  type: "STREAM";
  data: ChatStreamData;
};

/** 후속 채팅 스트림에서 올 수 있는 모든 SSE 프레임(일반 답변 또는 재페어링). */
export type PairingChatStreamEvent = ChatStreamEvent | PairingStreamEvent;
