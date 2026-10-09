import { parseSseStream } from "@/app/shared/lib/sse/parse-sse-stream";
import type {
  PairingChatStreamEvent,
  PairingStreamEvent,
  WinePairingChatRequest,
  WinePairingRequest,
} from "../model/wine-pairing.type";

type ErrorResponse = {
  message?: string;
};

/**
 * 브라우저 전용 페어링 스트림.
 * same-origin BFF(`/api/wine-pairings/pairing`)만 호출하고 세션 UUID를
 * `X-Session-Id` 헤더로 전달한다. SSE 프레임을 도착 순서대로 yield한다.
 */
export async function* streamWinePairing(
  request: WinePairingRequest,
  sessionId: string,
  signal?: AbortSignal,
): AsyncGenerator<PairingStreamEvent, void, undefined> {
  const body = await openBffStream(
    "/api/wine-pairings/pairing",
    request,
    sessionId,
    "와인 추천을 불러오지 못했습니다.",
    signal,
  );

  yield* parseSseStream<PairingStreamEvent>(body);
}

/**
 * 브라우저 전용 후속 채팅 스트림.
 * 일반 답변(field name 없는 STREAM) 또는 재페어링(field STREAM + JSON)을 yield한다.
 */
export async function* streamWinePairingChat(
  request: WinePairingChatRequest,
  sessionId: string,
  signal?: AbortSignal,
): AsyncGenerator<PairingChatStreamEvent, void, undefined> {
  const body = await openBffStream(
    "/api/wine-pairings/chat",
    request,
    sessionId,
    "채팅 응답을 불러오지 못했습니다.",
    signal,
  );

  yield* parseSseStream<PairingChatStreamEvent>(body);
}

async function openBffStream(
  path: string,
  request: unknown,
  sessionId: string,
  fallbackMessage: string,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-Session-Id": sessionId,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallbackMessage));
  }
  if (!response.body) {
    throw new Error(fallbackMessage);
  }

  return response.body;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ErrorResponse;
    return typeof data?.message === "string" && data.message
      ? data.message
      : fallback;
  } catch {
    return fallback;
  }
}
