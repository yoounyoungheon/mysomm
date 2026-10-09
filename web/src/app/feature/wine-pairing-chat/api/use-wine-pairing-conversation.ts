"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  streamWinePairing,
  streamWinePairingChat,
} from "@/app/entity/wine-pairing/api/wine-pairing.api";
import type {
  ChatStreamEvent,
  PairingChatStreamEvent,
  PairingFieldName,
  PairingStreamEvent,
  WinePairingRequest,
} from "@/app/entity/wine-pairing/model/wine-pairing.type";
import {
  isRecord,
  normalizePairingPayload,
} from "@/app/entity/wine-pairing/lib/normalize-pairing-payload";
import {
  isWinePairingConsumed,
  loadWinePairingSnapshot,
  markWinePairingConsumed,
} from "@/app/entity/wine-pairing-workflow/lib/workflow-snapshot-storage";
import type { WinePairingSnapshot } from "@/app/entity/wine-pairing-workflow/model/workflow-snapshot.type";
import {
  conversationReducer,
  initialConversationState,
} from "../model/conversation.reducer";
import type { ConversationAction } from "../model/conversation.types";
import { createConversationPresentation } from "../model/conversation-presentation";

const PAIRING_ERROR_FALLBACK = "와인 추천을 불러오지 못했습니다.";
const CHAT_ERROR_FALLBACK = "채팅 응답을 불러오지 못했습니다.";
const PAIRING_FIELD_NAMES: readonly PairingFieldName[] = [
  "rank",
  "name",
  "comment",
  "reason",
];

type HydratedSnapshot = {
  snapshot: WinePairingSnapshot | null;
  /** 이 세션의 pairing이 이미 소비됐는지(리로드 중복 페어링 방지). */
  alreadyConsumed: boolean;
  isHydrated: boolean;
};

/**
 * 와인 페어링 대화 컨트롤러 훅.
 *
 * - 순수 reducer가 대화 상태를 계산하고, 스트림 읽기(부수효과)는 이 훅에 격리한다.
 * - 추출 단계에서 생성한 동일 `X-Session-Id`를 pairing과 모든 chat에 재사용한다.
 * - 같은 session으로 pairing을 자동 재시도/자동 재호출하지 않는다(중복 생성 방지).
 * - SSE 데이터는 Zustand/TanStack Query에 저장하지 않는다(뷰 로컬 상태).
 */
export function useWinePairingConversation() {
  const [hydrated, setHydrated] = useState<HydratedSnapshot>({
    snapshot: null,
    alreadyConsumed: false,
    isHydrated: false,
  });

  useEffect(() => {
    const snapshot = loadWinePairingSnapshot();
    const alreadyConsumed = snapshot
      ? isWinePairingConsumed(snapshot.sessionId)
      : false;
    setHydrated({ snapshot, alreadyConsumed, isHydrated: true });
  }, []);

  const [state, dispatch] = useReducer(
    conversationReducer,
    initialConversationState,
  );

  const startedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatInFlightRef = useRef(false);

  const { snapshot, alreadyConsumed, isHydrated } = hydrated;
  const sessionId = snapshot?.sessionId ?? null;

  useEffect(() => {
    if (!isHydrated || !snapshot || alreadyConsumed || startedRef.current) {
      return;
    }
    startedRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    // 리로드 시 이 세션 pairing을 자동 재호출하지 않도록 소비 표시한다.
    markWinePairingConsumed(snapshot.sessionId);

    const request: WinePairingRequest = {
      wineIds: snapshot.wineIds,
      menuNames: snapshot.menuNames,
    };
    void runPairingStream(request, snapshot.sessionId, controller, dispatch);

    return () => {
      // StrictMode 재마운트/실제 언마운트 모두 스트림을 취소하고 재시작 가능 상태로 되돌린다.
      controller.abort();
      startedRef.current = false;
      dispatch({ type: "RESET" });
    };
  }, [isHydrated, snapshot, alreadyConsumed]);

  const isPairingDone = state.pairing === "done";
  const isChatStreaming = state.chat === "streaming";
  const isComposerEnabled =
    isPairingDone && state.committedPairingCount > 0 && !isChatStreaming;

  const sendChat = useCallback(
    (rawMessage: string) => {
      const message = rawMessage.trim();
      const signal = abortRef.current?.signal;

      if (
        !message ||
        !sessionId ||
        !isComposerEnabled ||
        !signal ||
        signal.aborted ||
        chatInFlightRef.current
      ) {
        return;
      }
      chatInFlightRef.current = true;

      // 질문 버블을 즉시 표시한다. 첫 SSE frame으로 ChatTurn/PairingTurn을 확정한다.
      dispatch({ type: "CHAT_START", question: message });

      void (async () => {
        let turnKind: "chat" | "pairing" | null = null;
        const presentation = createConversationPresentation(dispatch, signal);

        try {
          for await (const event of streamWinePairingChat(
            { message },
            sessionId,
            signal,
          )) {
            if (signal?.aborted) return;

            if (turnKind === null) {
              if (isChatStreamEvent(event)) {
                turnKind = "chat";
                presentation.enqueue({
                  type: "CHAT_APPEND",
                  chunk: event.data.body,
                });
              } else if (isPairingStreamEvent(event)) {
                turnKind = "pairing";
                // RECOMMENDATION_START가 빈 ChatTurn을 제거하고 PairingTurn으로 대체한다.
                // 턴의 종류는 즉시 확정해 첫 표시 tick 전에 실패해도 올바른 턴에 오류를 붙인다.
                dispatch({ type: "RECOMMENDATION_START", question: message });
                dispatchPairingEvent(event, presentation.enqueue);
              }
            } else if (turnKind === "chat") {
              if (isChatStreamEvent(event)) {
                presentation.enqueue({
                  type: "CHAT_APPEND",
                  chunk: event.data.body,
                });
              }
            } else if (isPairingStreamEvent(event)) {
              dispatchPairingEvent(event, presentation.enqueue);
            }
          }

          if (turnKind === "pairing") {
            await presentation.finish({ type: "PAIRING_DONE" });
          } else {
            await presentation.finish({ type: "CHAT_DONE" });
          }
        } catch (error) {
          presentation.cancel();
          if (signal?.aborted) return;

          if (turnKind === "pairing") {
            dispatch({
              type: "PAIRING_ERROR",
              message: toErrorMessage(error, CHAT_ERROR_FALLBACK),
            });
          } else {
            dispatch({
              type: "CHAT_ERROR",
              message: toErrorMessage(error, CHAT_ERROR_FALLBACK),
            });
          }
        } finally {
          presentation.cancel();
          chatInFlightRef.current = false;
        }
      })();
    },
    [sessionId, isComposerEnabled],
  );

  return {
    turns: state.turns,
    hasRequest: Boolean(snapshot),
    alreadyConsumed: alreadyConsumed && !startedRef.current,
    isHydrated,
    pairingStatus: state.pairing,
    chatStatus: state.chat,
    isPairingDone,
    isStreaming: state.pairing === "streaming" || isChatStreaming,
    isComposerEnabled,
    errorMessage: state.errorMessage ?? null,
    sendChat,
  };
}

async function runPairingStream(
  request: WinePairingRequest,
  sessionId: string,
  controller: AbortController,
  dispatch: (action: ConversationAction) => void,
) {
  dispatch({ type: "PAIRING_START" });
  const presentation = createConversationPresentation(
    dispatch,
    controller.signal,
  );

  try {
    for await (const event of streamWinePairing(
      request,
      sessionId,
      controller.signal,
    )) {
      if (controller.signal.aborted) {
        return;
      }
      dispatchPairingEvent(event, presentation.enqueue);
    }
    await presentation.finish({ type: "PAIRING_DONE" });
  } catch (error) {
    presentation.cancel();
    if (controller.signal.aborted) {
      return;
    }
    dispatch({
      type: "PAIRING_ERROR",
      message: toErrorMessage(error, PAIRING_ERROR_FALLBACK),
    });
  } finally {
    presentation.cancel();
  }
}

/**
 * 페어링 SSE 프레임을 reducer 액션으로 변환해 dispatch한다.
 * 알 수 없거나 잘못된 frame은 UI 상태에 반영하지 않는다.
 */
function dispatchPairingEvent(
  event: PairingStreamEvent,
  dispatch: (action: ConversationAction) => void,
): void {
  if (!isRecord(event)) return;
  if (event.type === "JSON") {
    const payload = normalizePairingPayload(event.data);
    if (payload) {
      dispatch({ type: "PAIRING_SLIDE_COMMIT", payload });
    }
    return;
  }

  if (event.type !== "STREAM" || !isRecord(event.data)) return;
  const fieldName = event.data.fieldName;
  if (
    PAIRING_FIELD_NAMES.includes(fieldName) &&
    typeof event.data.body === "string"
  ) {
    dispatch({
      type: "PAIRING_SLIDE_FIELD",
      field: fieldName,
      data: event.data.body,
    });
  }
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isPairingStreamEvent(
  event: PairingChatStreamEvent,
): event is PairingStreamEvent {
  return (
    isRecord(event) &&
    (event.type === "JSON" ||
      (event.type === "STREAM" &&
        typeof event.data === "object" &&
        event.data !== null &&
        "fieldName" in event.data))
  );
}

function isChatStreamEvent(
  event: PairingChatStreamEvent,
): event is ChatStreamEvent {
  return (
    isRecord(event) &&
    event.type === "STREAM" &&
    typeof event.data === "object" &&
    event.data !== null &&
    !("fieldName" in event.data) &&
    "body" in event.data &&
    typeof event.data.body === "string"
  );
}
