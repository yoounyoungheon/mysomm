import { describe, expect, it, vi } from "vitest";
import type { PairingSlidePayload } from "@/app/entity/wine-pairing/model/wine-pairing.type";
import {
  conversationReducer,
  initialConversationState,
} from "./conversation.reducer";
import type {
  ConversationAction,
  ConversationState,
} from "./conversation.types";

function reduce(
  state: ConversationState,
  actions: ConversationAction[],
): ConversationState {
  return actions.reduce(conversationReducer, state);
}

function payload(
  overrides: Partial<PairingSlidePayload> = {},
): PairingSlidePayload {
  return {
    pairingId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    rank: 1,
    wine: {
      id: "11111111-1111-4111-8111-111111111111",
      wineName: "클라우디 베이 소비뇽 블랑",
      vintage: 2023,
      alcohol: "12.5%",
      price: null,
      country: "New Zealand",
      region: "Marlborough",
      tannin: 1,
      body: null,
      sweetness: 1,
      acid: 4,
      wineBottleImageUrl: "https://example.com/cloudy-bay.jpg",
    },
    comment: "차갑게 즐겨보세요.",
    reason: "산뜻한 산도가 해산물과 어울립니다.",
    ...overrides,
  };
}

describe("conversationReducer - pairing", () => {
  it("does not depend on findLastIndex for pairing and chat", () => {
    const unsupported = vi
      .spyOn(Array.prototype, "findLastIndex")
      .mockImplementation(() => {
        throw new Error("Unsupported browser API");
      });
    try {
      const state = reduce(initialConversationState, [
        { type: "PAIRING_START" },
        { type: "PAIRING_SLIDE_FIELD", field: "name", data: "와인" },
        { type: "PAIRING_SLIDE_COMMIT", payload: payload() },
        { type: "PAIRING_DONE" },
        { type: "CHAT_START", question: "질문" },
        { type: "CHAT_APPEND", chunk: "답변" },
        { type: "CHAT_DONE" },
      ]);
      expect(state.pairing).toBe("done");
      expect(state.chat).toBe("idle");
      expect(unsupported).not.toHaveBeenCalled();
    } finally {
      unsupported.mockRestore();
    }
  });
  it("같은 fieldName의 STREAM 청크를 순서대로 append한다", () => {
    const state = reduce(initialConversationState, [
      { type: "PAIRING_START" },
      { type: "PAIRING_SLIDE_FIELD", field: "name", data: "클라우디 " },
      { type: "PAIRING_SLIDE_FIELD", field: "name", data: "베이" },
    ]);

    const turn = state.turns[0];
    expect(turn.kind).toBe("pairing");
    if (turn.kind === "pairing") {
      expect(turn.slides[0].name).toBe("클라우디 베이");
      expect(turn.slides[0].isCommitted).toBe(false);
    }
  });

  it("JSON 프레임은 미확정 slide를 권위값으로 전체 교체하고 committed 수를 늘린다", () => {
    const state = reduce(initialConversationState, [
      { type: "PAIRING_START" },
      { type: "PAIRING_SLIDE_FIELD", field: "name", data: "임시 이름" },
      { type: "PAIRING_SLIDE_COMMIT", payload: payload() },
    ]);

    const turn = state.turns[0];
    expect(state.committedPairingCount).toBe(1);
    if (turn.kind === "pairing") {
      expect(turn.slides).toHaveLength(1);
      expect(turn.slides[0].name).toBe("클라우디 베이 소비뇽 블랑");
      expect(turn.slides[0].imageUrl).toBe(
        "https://example.com/cloudy-bay.jpg",
      );
      expect(turn.slides[0].isCommitted).toBe(true);
    }
  });

  it("STREAM 프레임 없이 JSON만 와도 committed slide를 생성한다", () => {
    const state = reduce(initialConversationState, [
      { type: "PAIRING_START" },
      { type: "PAIRING_SLIDE_COMMIT", payload: payload() },
      { type: "PAIRING_SLIDE_COMMIT", payload: payload({ rank: 2 }) },
    ]);

    const turn = state.turns[0];
    expect(state.committedPairingCount).toBe(2);
    if (turn.kind === "pairing") {
      expect(turn.slides).toHaveLength(2);
      expect(turn.slides.every((slide) => slide.isCommitted)).toBe(true);
    }
  });

  it("committed slide가 있으면 PAIRING_DONE 시 done으로 확정한다", () => {
    const state = reduce(initialConversationState, [
      { type: "PAIRING_START" },
      { type: "PAIRING_SLIDE_COMMIT", payload: payload() },
      { type: "PAIRING_DONE" },
    ]);

    expect(state.pairing).toBe("done");
    expect(state.turns[0].status).toBe("done");
  });

  it("committed JSON slide 없이 stream이 끝나면 오류로 확정한다", () => {
    const state = reduce(initialConversationState, [
      { type: "PAIRING_START" },
      { type: "PAIRING_SLIDE_FIELD", field: "name", data: "미완성" },
      { type: "PAIRING_DONE" },
    ]);

    expect(state.pairing).toBe("error");
    expect(state.turns[0].status).toBe("error");
    expect(state.errorMessage).toBeTruthy();
  });
});

describe("conversationReducer - chat", () => {
  it("일반 chat 청크를 순서대로 append한다", () => {
    const state = reduce(initialConversationState, [
      { type: "PAIRING_START" },
      { type: "PAIRING_SLIDE_COMMIT", payload: payload() },
      { type: "PAIRING_DONE" },
      { type: "CHAT_START", question: "서빙 온도는?" },
      { type: "CHAT_APPEND", chunk: "8~10도 " },
      { type: "CHAT_APPEND", chunk: "정도예요." },
      { type: "CHAT_DONE" },
    ]);

    const last = state.turns[state.turns.length - 1];
    expect(last.kind).toBe("chat");
    if (last.kind === "chat") {
      expect(last.answer).toBe("8~10도 정도예요.");
      expect(last.status).toBe("done");
    }
  });

  it("RECOMMENDATION_START는 낙관적 빈 chat turn을 pairing turn으로 대체한다", () => {
    const state = reduce(initialConversationState, [
      { type: "PAIRING_START" },
      { type: "PAIRING_SLIDE_COMMIT", payload: payload() },
      { type: "PAIRING_DONE" },
      { type: "CHAT_START", question: "스테이크랑 어울리는 와인은?" },
      { type: "RECOMMENDATION_START", question: "스테이크랑 어울리는 와인은?" },
      { type: "PAIRING_SLIDE_COMMIT", payload: payload({ rank: 1 }) },
      { type: "PAIRING_DONE" },
    ]);

    const chatTurns = state.turns.filter((turn) => turn.kind === "chat");
    const pairingTurns = state.turns.filter((turn) => turn.kind === "pairing");
    // 최초 pairing 1개 + 재페어링 1개, 낙관적 chat turn은 제거됨.
    expect(pairingTurns).toHaveLength(2);
    expect(chatTurns).toHaveLength(0);
    expect(state.pairing).toBe("done");
  });
});
