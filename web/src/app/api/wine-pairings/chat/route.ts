import { NextResponse, type NextRequest } from "next/server";
import { withServerRequestLog } from "@/app/utils/http/server-log";
import {
  openWinePairingChatStream,
  WinePairingBackendError,
} from "@/app/entity/wine-pairing/api/wine-pairing.server";
import { isUuidString } from "@/app/shared/lib/validation/uuid";
import {
  createBetaUnauthorizedResponse,
  hasValidBetaAccess,
} from "@/lib/auth/beta-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SESSION_ID_HEADER = "X-Session-Id";
const MAX_MESSAGE_LENGTH = 2000;

type ChatRequestBody = {
  message?: unknown;
};

export const POST = withServerRequestLog(
  "wine.chat",
  async (request: NextRequest, log) => {
    if (!(await hasValidBetaAccess(request))) {
      return createBetaUnauthorizedResponse();
    }

    log.event("auth.accepted");
    const sessionId = request.headers.get(SESSION_ID_HEADER)?.trim() ?? "";
    if (!isUuidString(sessionId)) {
      return NextResponse.json(
        {
          message:
            "세션 정보가 올바르지 않습니다. 처음부터 다시 시도해 주세요.",
        },
        { status: 400 },
      );
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json(
        { message: "요청 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as ChatRequestBody | null;
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { message: "질문을 입력해 주세요." },
        { status: 400 },
      );
    }

    log.event("validation.passed", { messageLength: message.length });
    try {
      const backendResponse = await openWinePairingChatStream(
        { message },
        sessionId,
        request.signal,
        log,
      );

      return new Response(backendResponse.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (error) {
      log.error("chat.failed", error, {
        status: error instanceof WinePairingBackendError ? error.status : 502,
      });
      if (error instanceof WinePairingBackendError) {
        return NextResponse.json(
          { message: mapChatError(error.status) },
          { status: error.status },
        );
      }

      return NextResponse.json(
        { message: "채팅 응답을 불러오지 못했습니다." },
        { status: 502 },
      );
    }
  },
);

function mapChatError(status: number): string {
  switch (status) {
    case 400:
      return "채팅 요청이 올바르지 않습니다.";
    case 404:
      return "이전 와인 추천을 찾을 수 없습니다. 처음부터 다시 시도해 주세요.";
    case 409:
      return "지금은 채팅을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "채팅 응답을 불러오지 못했습니다.";
  }
}
