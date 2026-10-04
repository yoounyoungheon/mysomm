import type {
  ChatTurn,
  ConversationAction,
  ConversationState,
  ConversationTurn,
  PairingSlideView,
  PairingTurn,
} from "./conversation.types";

const NO_COMMITTED_SLIDE_MESSAGE = "추천 결과를 받지 못했습니다.";

export const initialConversationState: ConversationState = {
  turns: [],
  pairing: "idle",
  chat: "idle",
  committedPairingCount: 0,
};

/**
 * 대화 상태 순수 reducer.
 *
 * SSE 렌더링 규칙:
 * - `STREAM` rank/name/comment/reason → 해당 필드에 청크 이어붙임
 * - `JSON` → 슬라이드 전체를 최종 payload로 replace(권위값), committed 카운트 증가
 * - `hasNext: false`는 필드 완료 신호일 뿐 slide/stream 완료가 아님
 * - stream 종료 시 committed slide가 하나도 없으면 오류로 확정
 * - 채팅 `STREAM` → 마지막 채팅 말풍선에 청크 이어붙임
 */
export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case "PRESENTATION_BATCH":
      return action.actions.reduce(conversationReducer, state);

    case "PAIRING_START":
      return {
        ...state,
        pairing: "streaming",
        errorMessage: undefined,
        turns: [
          ...state.turns,
          { kind: "pairing", source: "initial", slides: [], status: "streaming" },
        ],
      };

    case "RECOMMENDATION_START": {
      // 낙관적으로 추가된 빈 ChatTurn이 있으면 제거하고 PairingTurn으로 대체한다.
      const last = state.turns[state.turns.length - 1];
      const baseTurns =
        last?.kind === "chat" && last.answer === "" && last.status === "streaming"
          ? state.turns.slice(0, -1)
          : state.turns;

      return {
        ...state,
        chat: "streaming",
        errorMessage: undefined,
        turns: [
          ...baseTurns,
          {
            kind: "pairing",
            source: "recommendation",
            question: action.question,
            slides: [],
            status: "streaming",
          },
        ],
      };
    }

    case "PAIRING_SLIDE_FIELD":
      return updateLastPairingTurn(state, (turn) =>
        appendLastSlideField(turn, action.field, action.data)
      );

    case "PAIRING_SLIDE_COMMIT": {
      const { payload } = action;
      const committedSlide: PairingSlideView = {
        imageUrl: payload.wine.wineBottleImageUrl ?? "",
        rank: String(payload.rank),
        name: payload.wine.wineName,
        comment: payload.comment,
        reason: payload.reason,
        wine: payload.wine,
        isCommitted: true,
      };

      const nextState = updateLastPairingTurn(state, (turn) => {
        const lastSlide = turn.slides[turn.slides.length - 1];
        // JSON은 권위값이므로 STREAM 프레임이 없어도 슬라이드를 보장한다.
        if (!lastSlide) {
          return { ...turn, slides: [committedSlide] };
        }
        if (lastSlide.isCommitted) {
          return { ...turn, slides: [...turn.slides, committedSlide] };
        }
        return updateLastSlide(turn, () => committedSlide);
      });

      return {
        ...nextState,
        committedPairingCount: nextState.committedPairingCount + 1,
      };
    }

    case "PAIRING_DONE": {
      const lastPairingTurn = findLastTurnOfKind(state, "pairing");
      const committedInTurn =
        lastPairingTurn?.slides.filter((slide) => slide.isCommitted).length ?? 0;

      // committed JSON slide가 하나도 없이 종료되면 성공으로 확정하지 않는다.
      if (committedInTurn === 0) {
        return {
          ...updateLastPairingTurn(state, (turn) => ({
            ...turn,
            status: "error",
            errorMessage: NO_COMMITTED_SLIDE_MESSAGE,
          })),
          pairing: "error",
          chat: "idle",
          errorMessage: NO_COMMITTED_SLIDE_MESSAGE,
        };
      }

      return {
        ...updateLastPairingTurn(state, (turn) => ({
          ...turn,
          status: "done",
        })),
        pairing: "done",
        chat: "idle",
      };
    }

    case "PAIRING_ERROR":
      return {
        ...updateLastPairingTurn(state, (turn) => ({
          ...turn,
          status: "error",
          errorMessage: action.message,
        })),
        pairing: "error",
        chat: "idle",
        errorMessage: action.message,
      };

    case "CHAT_START":
      return {
        ...state,
        chat: "streaming",
        errorMessage: undefined,
        turns: [
          ...state.turns,
          { kind: "chat", question: action.question, answer: "", status: "streaming" },
        ],
      };

    case "CHAT_APPEND":
      return updateLastChatTurn(state, (turn) => ({
        ...turn,
        answer: turn.answer + action.chunk,
      }));

    case "CHAT_DONE":
      return {
        ...updateLastChatTurn(state, (turn) => ({ ...turn, status: "done" })),
        chat: "idle",
      };

    case "CHAT_ERROR":
      return {
        ...updateLastChatTurn(state, (turn) => ({
          ...turn,
          status: "error",
          errorMessage: action.message,
        })),
        chat: "error",
        errorMessage: action.message,
      };

    case "RESET":
      return initialConversationState;
  }
}

function createSlide(): PairingSlideView {
  return {
    imageUrl: "",
    rank: "",
    name: "",
    comment: "",
    reason: "",
    wine: null,
    isCommitted: false,
  };
}

function appendLastSlideField(
  turn: PairingTurn,
  field: "rank" | "name" | "comment" | "reason",
  chunk: string
): PairingTurn {
  const slides = [...turn.slides];
  const lastSlide = slides[slides.length - 1];
  const slide = !lastSlide || lastSlide.isCommitted ? createSlide() : lastSlide;
  const nextSlide = {
    ...slide,
    [field]: slide[field] + chunk,
  };

  if (!lastSlide || lastSlide.isCommitted) {
    slides.push(nextSlide);
  } else {
    slides[slides.length - 1] = nextSlide;
  }

  return { ...turn, slides };
}

function findLastTurnOfKind<K extends ConversationTurn["kind"]>(
  state: ConversationState,
  kind: K
): Extract<ConversationTurn, { kind: K }> | undefined {
  const index = state.turns.findLastIndex((turn) => turn.kind === kind);
  return index === -1
    ? undefined
    : (state.turns[index] as Extract<ConversationTurn, { kind: K }>);
}

/** 마지막 pairing turn을 갱신한다. 없으면 상태를 그대로 반환한다(defensive). */
function updateLastPairingTurn(
  state: ConversationState,
  updater: (turn: PairingTurn) => PairingTurn
): ConversationState {
  return updateLastTurnOfKind(state, "pairing", updater);
}

/** 마지막 chat turn을 갱신한다. 없으면 상태를 그대로 반환한다(defensive). */
function updateLastChatTurn(
  state: ConversationState,
  updater: (turn: ChatTurn) => ChatTurn
): ConversationState {
  return updateLastTurnOfKind(state, "chat", updater);
}

function updateLastTurnOfKind<K extends ConversationTurn["kind"]>(
  state: ConversationState,
  kind: K,
  updater: (turn: Extract<ConversationTurn, { kind: K }>) => ConversationTurn
): ConversationState {
  const index = state.turns.findLastIndex((turn) => turn.kind === kind);
  if (index === -1) {
    return state;
  }

  const turns = [...state.turns];
  turns[index] = updater(turns[index] as Extract<ConversationTurn, { kind: K }>);
  return { ...state, turns };
}

function updateLastSlide(
  turn: PairingTurn,
  updater: (slide: PairingSlideView) => PairingSlideView
): PairingTurn {
  if (turn.slides.length === 0) {
    return turn;
  }

  const slides = [...turn.slides];
  slides[slides.length - 1] = updater(slides[slides.length - 1]);
  return { ...turn, slides };
}
