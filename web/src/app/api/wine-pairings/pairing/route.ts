import { NextResponse, type NextRequest } from "next/server";
import { withServerRequestLog } from "@/app/utils/http/server-log";
import {
  openWinePairingStream,
  WinePairingBackendError,
} from "@/app/entity/wine-pairing/api/wine-pairing.server";
import type { WinePairingRequest } from "@/app/entity/wine-pairing/model/wine-pairing.type";
import { isUuidString, normalizeUuid } from "@/app/shared/lib/validation/uuid";
import {
  createBetaUnauthorizedResponse,
  hasValidBetaAccess,
} from "@/lib/auth/beta-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SESSION_ID_HEADER = "X-Session-Id";
const MAX_WINES = 100;
const MAX_MENU_NAMES = 50;
const MAX_MENU_NAME_LENGTH = 200;

type PairingRequestBody = {
  wineIds?: unknown;
  menuNames?: unknown;
};

export const POST = withServerRequestLog(
  "wine.pairing",
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
      .catch(() => null)) as PairingRequestBody | null;

    const pairingRequest = parsePairingRequest(body);
    if (!pairingRequest) {
      return NextResponse.json(
        { message: "와인과 메뉴를 선택해 주세요." },
        { status: 400 },
      );
    }

    log.event("validation.passed", {
      wineCount: pairingRequest.wineIds.length,
      menuCount: pairingRequest.menuNames.length,
    });
    try {
      const backendResponse = await openWinePairingStream(
        pairingRequest,
        sessionId,
        request.signal,
        log,
      );

      // 백엔드 SSE body를 버퍼링 없이 그대로 파이프한다.
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
      log.error("pairing.failed", error, {
        status: error instanceof WinePairingBackendError ? error.status : 502,
      });
      if (error instanceof WinePairingBackendError) {
        return NextResponse.json(
          { message: mapPairingError(error.status) },
          { status: error.status },
        );
      }

      return NextResponse.json(
        { message: "와인 추천을 불러오지 못했습니다." },
        { status: 502 },
      );
    }
  },
);

/**
 * 페어링 요청 body를 백엔드 계약 shape으로 검증한다.
 * `wineIds[]`는 UUID, `menuNames[]`는 공백 아닌 문자열이며 둘 다 비어 있을 수 없다.
 */
function parsePairingRequest(
  body: PairingRequestBody | null,
): WinePairingRequest | null {
  if (!body) return null;

  const { wineIds, menuNames } = body;

  if (
    !Array.isArray(wineIds) ||
    wineIds.length === 0 ||
    wineIds.length > MAX_WINES
  ) {
    return null;
  }
  if (
    !Array.isArray(menuNames) ||
    menuNames.length === 0 ||
    menuNames.length > MAX_MENU_NAMES
  ) {
    return null;
  }

  const parsedWineIds: string[] = [];
  for (const wineId of wineIds) {
    const normalized = normalizeUuid(wineId);
    if (!normalized) return null;
    parsedWineIds.push(normalized);
  }

  const parsedMenuNames: string[] = [];
  for (const name of menuNames) {
    if (
      typeof name !== "string" ||
      name.trim().length === 0 ||
      name.length > MAX_MENU_NAME_LENGTH
    ) {
      return null;
    }
    // 추천 응답 name과 철자까지 동일해야 하므로 내부 문자는 바꾸지 않는다.
    parsedMenuNames.push(name);
  }

  return {
    wineIds: [...new Set(parsedWineIds)],
    menuNames: [...new Set(parsedMenuNames)],
  };
}

function mapPairingError(status: number): string {
  switch (status) {
    case 400:
      return "와인 페어링 요청이 올바르지 않습니다.";
    case 404:
      return "세션 또는 추천 정보를 찾을 수 없습니다. 처음부터 다시 시도해 주세요.";
    case 409:
      return "이미 진행 중인 추천이 있습니다. 처음부터 다시 시작해 주세요.";
    default:
      return "와인 추천을 불러오지 못했습니다.";
  }
}
