import "server-only";
import {
  loggedBackendFetch,
  type ServerRequestLog,
} from "@/app/utils/http/server-log";

import { buildMysomApiUrl } from "@/app/utils/http/server-api";
import type {
  WinePairingChatRequest,
  WinePairingRequest,
} from "../model/wine-pairing.type";

const PAIRING_PATH = "/v1/wine-pairings/pairing";
const CHAT_PATH = "/v1/wine-pairings/chat";
const SESSION_ID_HEADER = "X-Session-Id";

/**
 * 서버 전용 백엔드 오류.
 * Route Handler가 상태 코드만 참고해 safe message로 변환하도록 status를 담는다.
 */
export class WinePairingBackendError extends Error {
  constructor(readonly status: number) {
    super(`Wine pairing backend responded with ${status}`);
    this.name = "WinePairingBackendError";
  }
}

/**
 * 서버 전용 페어링 스트림 오픈 helper.
 * 성공 시 백엔드 `Response`를 그대로 반환해 Route Handler가 body를 파이프한다.
 * 스트리밍이므로 timeout 대신 클라이언트 연결 해제(signal)로 취소한다.
 */
export async function openWinePairingStream(
  request: WinePairingRequest,
  sessionId: string,
  signal?: AbortSignal,
  log?: ServerRequestLog,
): Promise<Response> {
  return openStream(PAIRING_PATH, request, sessionId, signal, log);
}

/** 서버 전용 후속 채팅 스트림 오픈 helper. */
export async function openWinePairingChatStream(
  request: WinePairingChatRequest,
  sessionId: string,
  signal?: AbortSignal,
  log?: ServerRequestLog,
): Promise<Response> {
  return openStream(CHAT_PATH, request, sessionId, signal, log);
}

async function openStream(
  path: string,
  body: unknown,
  sessionId: string,
  signal?: AbortSignal,
  log?: ServerRequestLog,
): Promise<Response> {
  const response = await loggedBackendFetch(log, () =>
    fetch(buildMysomApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        [SESSION_ID_HEADER]: sessionId,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    }),
  );

  if (!response.ok || !response.body) {
    // 오류 body는 노출하지 않고 상태 코드만 전달한다.
    await response.body?.cancel().catch(() => undefined);
    throw new WinePairingBackendError(response.status);
  }

  return response;
}
