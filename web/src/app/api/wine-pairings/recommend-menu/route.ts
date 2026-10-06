import { NextResponse, type NextRequest } from "next/server";
import { withServerRequestLog } from "@/app/utils/http/server-log";
import {
  MenuRecommendationBackendError,
  recommendMenus,
} from "@/app/entity/menu-category-recommendation/api/menu-category-recommendation.server";
import { isUuidString, normalizeUuid } from "@/app/shared/lib/validation/uuid";
import {
  createBetaUnauthorizedResponse,
  hasValidBetaAccess,
} from "@/lib/auth/beta-request";

const SESSION_ID_HEADER = "X-Session-Id";
const MAX_WINES = 100;

type RecommendRequestBody = {
  pairingWineIds?: unknown;
};

export const POST = withServerRequestLog(
  "wine.recommend-menu",
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
      .catch(() => null)) as RecommendRequestBody | null;

    const pairingWineIds = parseWineIds(body?.pairingWineIds);
    if (!pairingWineIds) {
      return NextResponse.json(
        { message: "추천할 와인을 1개 이상 선택해 주세요." },
        { status: 400 },
      );
    }

    log.event("validation.passed", { wineCount: pairingWineIds.length });
    try {
      const recommendedMenus = await recommendMenus(
        sessionId,
        {
          pairingWineIds,
        },
        log,
      );
      log.event("recommendation.completed", {
        menuCount: recommendedMenus.length,
      });
      return NextResponse.json({ recommendedMenus });
    } catch (error) {
      log.error("recommendation.failed", error, {
        status:
          error instanceof MenuRecommendationBackendError ? error.status : 502,
      });
      if (error instanceof MenuRecommendationBackendError) {
        return NextResponse.json(
          { message: mapRecommendError(error.status) },
          { status: error.status },
        );
      }

      return NextResponse.json(
        { message: "추천 메뉴를 불러오지 못했습니다." },
        { status: 502 },
      );
    }
  },
);

/** `pairingWineIds`를 백엔드 계약 shape(비어 있지 않은 UUID[])으로 검증한다. */
function parseWineIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_WINES) {
    return null;
  }

  const wineIds: string[] = [];
  for (const item of input) {
    const wineId = normalizeUuid(item);
    if (!wineId) {
      return null;
    }
    wineIds.push(wineId);
  }

  return [...new Set(wineIds)];
}

function mapRecommendError(status: number): string {
  switch (status) {
    case 400:
      return "추천할 와인 정보가 올바르지 않습니다.";
    case 404:
      return "선택한 와인 또는 세션을 찾을 수 없습니다. 처음부터 다시 시도해 주세요.";
    case 409:
      return "와인 메뉴가 변경되었습니다. 메뉴 추천을 다시 진행해 주세요.";
    default:
      return "추천 메뉴를 불러오지 못했습니다.";
  }
}
