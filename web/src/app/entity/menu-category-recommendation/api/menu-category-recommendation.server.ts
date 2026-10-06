import "server-only";
import {
  loggedBackendFetch,
  type ServerRequestLog,
} from "@/app/utils/http/server-log";

import { buildMysomApiUrl } from "@/app/utils/http/server-api";
import type {
  MenuRecommendationRequest,
  MenuRecommendationResponseDto,
  RecommendedMenu,
} from "../model/menu-category-recommendation.type";
import { mapMenuRecommendationDto } from "./menu-category-recommendation.mapper";

const RECOMMEND_MENU_PATH = "/v1/wine-pairings/recommend-menu";
const BACKEND_TIMEOUT_MS = 60_000;

/**
 * 서버 전용 백엔드 오류.
 * Route Handler가 상태 코드만 참고해 safe message로 변환하도록 status를 담는다.
 */
export class MenuRecommendationBackendError extends Error {
  constructor(readonly status: number) {
    super(`Menu recommendation backend responded with ${status}`);
    this.name = "MenuRecommendationBackendError";
  }
}

/**
 * 서버 전용 메뉴 추천 helper.
 * 세션 UUID를 `X-Session-Id` 헤더로 전달하고 추천 메뉴 목록을 반환한다.
 */
export async function recommendMenus(
  sessionId: string,
  request: MenuRecommendationRequest,
  log?: ServerRequestLog,
): Promise<RecommendedMenu[]> {
  const response = await loggedBackendFetch(log, () =>
    fetch(buildMysomApiUrl(RECOMMEND_MENU_PATH), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Session-Id": sessionId,
      },
      body: JSON.stringify(request),
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    }),
  );

  if (!response.ok) {
    throw new MenuRecommendationBackendError(response.status);
  }

  const dto = (await response.json()) as MenuRecommendationResponseDto;
  const menus = mapMenuRecommendationDto(dto);
  log?.event("backend.response.mapped", { menuCount: menus.length });
  return menus;
}
