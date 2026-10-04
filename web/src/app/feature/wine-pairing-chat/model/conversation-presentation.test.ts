import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PairingSlidePayload } from "@/app/entity/wine-pairing/model/wine-pairing.type";
import { createConversationPresentation } from "./conversation-presentation";
import { conversationReducer, initialConversationState } from "./conversation.reducer";
import type { ConversationAction } from "./conversation.types";

const payload: PairingSlidePayload = {
  pairingId: "pairing-1",
  rank: 1,
  wine: {
    id: "wine-1", wineName: "화이트 와인", vintage: null, alcohol: null,
    price: null, country: null, region: null, tannin: null, body: null,
    sweetness: null, acid: null, wineBottleImageUrl: null,
  },
  comment: "해산물과 즐겨요",
  reason: "산도가 잘 어울려요",
};

function setup(start: ConversationAction = { type: "CHAT_START", question: "질문" }) {
  let state = conversationReducer(initialConversationState, start);
  const dispatch = vi.fn((action: ConversationAction) => {
    state = conversationReducer(state, action);
  });
  const controller = new AbortController();
  const presentation = createConversationPresentation(dispatch, controller.signal);
  return { presentation, controller, dispatch, getState: () => state };
}

function answer(context: ReturnType<typeof setup>) {
  const turn = context.getState().turns.at(-1);
  return turn?.kind === "chat" ? turn.answer : "";
}

describe("conversation presentation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("일괄 응답도 40ms마다 3자만 표시하고 완료는 버퍼 소진 후 처리한다", async () => {
    const c = setup();
    c.presentation.enqueue({ type: "CHAT_APPEND", chunk: "가나다라마바사아자" });
    const finished = c.presentation.finish({ type: "CHAT_DONE" });
    expect(c.dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(answer(c)).toBe("가나다");
    expect(c.getState().chat).toBe("streaming");
    vi.advanceTimersByTime(40);
    expect(answer(c)).toBe("가나다라마바");
    vi.advanceTimersByTime(40);
    await finished;
    expect(answer(c)).toBe("가나다라마바사아자");
    expect(c.getState().chat).toBe("idle");
    expect(c.dispatch).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("동일 텍스트의 frame 크기가 달라도 tick당 표시량은 같다", () => {
    const burst = setup();
    const split = setup();
    burst.presentation.enqueue({ type: "CHAT_APPEND", chunk: "abcdefghi" });
    for (const chunk of ["a", "bc", "d", "efghi"]) {
      split.presentation.enqueue({ type: "CHAT_APPEND", chunk });
    }
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(40);
      expect(answer(split)).toBe(answer(burst));
      expect(split.dispatch).toHaveBeenCalledTimes(i + 1);
    }
    burst.presentation.cancel();
    split.presentation.cancel();
  });

  it("버퍼가 비면 타이머를 멈추고 새 데이터 도착 시 재개한다", () => {
    const c = setup();
    c.presentation.enqueue({ type: "CHAT_APPEND", chunk: "abc" });
    vi.advanceTimersByTime(2000);
    expect(answer(c)).toBe("abc");
    expect(c.dispatch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    c.presentation.enqueue({ type: "CHAT_APPEND", chunk: "defghi" });
    vi.advanceTimersByTime(40);
    expect(answer(c)).toBe("abcdef");
    c.presentation.cancel();
  });

  it("emoji surrogate pair를 나누지 않는다", () => {
    const c = setup();
    c.presentation.enqueue({ type: "CHAT_APPEND", chunk: "🍷가🍇나" });
    vi.advanceTimersByTime(40);
    expect(answer(c)).toBe("🍷가🍇");
    vi.advanceTimersByTime(40);
    expect(answer(c)).toBe("🍷가🍇나");
    c.presentation.cancel();
  });

  it("JSON-only 여러 추천도 점진 표시한 뒤 카드별로 순서대로 확정한다", async () => {
    const c = setup({ type: "PAIRING_START" });
    c.presentation.enqueue({ type: "PAIRING_SLIDE_COMMIT", payload });
    c.presentation.enqueue({
      type: "PAIRING_SLIDE_COMMIT",
      payload: { ...payload, rank: 2, wine: { ...payload.wine, id: "wine-2" } },
    });
    const finished = c.presentation.finish({ type: "PAIRING_DONE" });
    vi.advanceTimersByTime(40);
    expect(c.getState().committedPairingCount).toBe(0);
    const turn = c.getState().turns[0];
    expect(turn.kind === "pairing" && turn.slides[0].name).toBe("화이");
    vi.runAllTimers();
    await finished;
    const result = c.getState().turns[0];
    expect(result.kind === "pairing" && result.slides.map(s => s.rank)).toEqual(["1", "2"]);
    expect(c.getState().committedPairingCount).toBe(2);
    expect(c.getState().pairing).toBe("done");
  });

  it("STREAM prefix와 최종 JSON suffix를 중복 없이 표시하고 확정한다", () => {
    const c = setup({ type: "PAIRING_START" });
    c.presentation.enqueue({ type: "PAIRING_SLIDE_FIELD", field: "name", data: "화이" });
    c.presentation.enqueue({ type: "PAIRING_SLIDE_COMMIT", payload });
    vi.advanceTimersByTime(40);
    const partial = c.getState().turns[0];
    expect(partial.kind === "pairing" && partial.slides[0].name).toBe("화이");
    vi.runAllTimers();
    const result = c.getState().turns[0];
    expect(result.kind === "pairing" && result.slides[0].name).toBe(payload.wine.wineName);
    expect(c.getState().committedPairingCount).toBe(1);
    c.presentation.cancel();
  });

  it("JSON이 STREAM을 정정하면 최종 권위값을 유지한다", () => {
    const c = setup({ type: "PAIRING_START" });
    c.presentation.enqueue({ type: "PAIRING_SLIDE_FIELD", field: "name", data: "다른 이름" });
    c.presentation.enqueue({ type: "PAIRING_SLIDE_COMMIT", payload });
    vi.runAllTimers();
    const result = c.getState().turns[0];
    expect(result.kind === "pairing" && result.slides[0].name).toBe(payload.wine.wineName);
    c.presentation.cancel();
  });

  it("abort는 버퍼와 타이머를 제거하고 완료 대기를 해제한다", async () => {
    const c = setup();
    c.presentation.enqueue({ type: "CHAT_APPEND", chunk: "abcdefghijk" });
    const finished = c.presentation.finish({ type: "CHAT_DONE" });
    vi.advanceTimersByTime(40);
    c.controller.abort();
    c.presentation.enqueue({ type: "CHAT_APPEND", chunk: "late" });
    vi.runAllTimers();
    await finished;
    expect(answer(c)).toBe("abc");
    expect(c.getState().chat).toBe("streaming");
    expect(c.dispatch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("오류 발생 시 cancel 후에는 대기 중 JSON 확정이나 완료가 적용되지 않는다", () => {
    const c = setup({ type: "PAIRING_START" });
    c.presentation.enqueue({ type: "PAIRING_SLIDE_COMMIT", payload });
    vi.advanceTimersByTime(40);
    c.presentation.cancel();
    c.dispatch({ type: "PAIRING_ERROR", message: "연결 오류" });
    vi.runAllTimers();
    expect(c.getState().pairing).toBe("error");
    expect(c.getState().committedPairingCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
