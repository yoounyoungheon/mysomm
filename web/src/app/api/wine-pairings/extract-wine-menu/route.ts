import { NextResponse, type NextRequest } from "next/server";
import {
  withServerRequestLog,
  loggedBackendFetch,
} from "@/app/utils/http/server-log";
import { hasValidWineMenuImageSignature } from "@/app/entity/wine/api/wine-menu-image.server";
import {
  getWineMenuImageValidationMessage,
  MAX_WINE_MENU_IMAGE_COUNT,
  MAX_WINE_MENU_IMAGE_SIZE,
  MAX_WINE_MENU_IMAGE_TOTAL_SIZE,
  WINE_MENU_IMAGE_PART_NAME,
} from "@/app/entity/wine/model/wine-menu-image";
import { wineMenuExtractResponseSchema } from "@/app/entity/wine/model/wine.schema";
import { isCatalogExcluded } from "@/app/shared/config/wine-catalog";
import { isUuidString } from "@/app/shared/lib/validation/uuid";
import { buildMysomApiUrl } from "@/app/utils/http/server-api";
import {
  createBetaUnauthorizedResponse,
  hasValidBetaAccess,
} from "@/lib/auth/beta-request";

const EXTRACT_WINE_MENU_PATH = "/v1/wine-pairings/extract-wine-menu";
const SESSION_ID_HEADER = "X-Session-Id";
const BACKEND_TIMEOUT_MS = 295_000;

export const maxDuration = 300;

export const POST = withServerRequestLog(
  "wine.extract-menu",
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

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json(
        { message: "이미지 업로드 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { message: "이미지 업로드 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const files = formData
      .getAll(WINE_MENU_IMAGE_PART_NAME)
      .filter((part): part is File => part instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { message: "와인 메뉴 이미지를 1장 이상 첨부해 주세요." },
        { status: 400 },
      );
    }

    if (files.length > MAX_WINE_MENU_IMAGE_COUNT) {
      return NextResponse.json(
        {
          message: `이미지는 최대 ${MAX_WINE_MENU_IMAGE_COUNT}장까지 첨부할 수 있습니다.`,
        },
        { status: 400 },
      );
    }

    let totalSize = 0;
    for (const file of files) {
      totalSize += file.size;

      const validationMessage = getWineMenuImageValidationMessage(file);
      if (validationMessage) {
        return NextResponse.json(
          { message: validationMessage },
          { status: file.size > MAX_WINE_MENU_IMAGE_SIZE ? 413 : 400 },
        );
      }

      if (!(await hasValidWineMenuImageSignature(file))) {
        return NextResponse.json(
          { message: "PNG 또는 JPEG 이미지만 지원합니다." },
          { status: 400 },
        );
      }
    }

    if (totalSize > MAX_WINE_MENU_IMAGE_TOTAL_SIZE) {
      return NextResponse.json(
        {
          message: "첨부한 이미지 총 용량이 너무 큽니다. 일부를 제거해 주세요.",
        },
        { status: 413 },
      );
    }

    // multipart order를 유지해 백엔드로 재구성한다. Content-Type(boundary)은 fetch가 생성한다.
    const backendForm = new FormData();
    log.event("validation.passed", {
      imageCount: files.length,
      imageBytes: totalSize,
    });
    for (const file of files) {
      backendForm.append(WINE_MENU_IMAGE_PART_NAME, file, file.name);
    }

    let response: Response;
    try {
      response = await loggedBackendFetch(log, () =>
        fetch(buildMysomApiUrl(EXTRACT_WINE_MENU_PATH), {
          method: "POST",
          headers: {
            Accept: "application/json",
            [SESSION_ID_HEADER]: sessionId,
          },
          body: backendForm,
          cache: "no-store",
          signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        }),
      );
    } catch {
      return NextResponse.json(
        {
          message:
            "와인 메뉴 이미지 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 502 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: mapExtractError(response.status) },
        { status: response.status },
      );
    }

    const parsed = wineMenuExtractResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success) {
      log.event("backend.response.invalid", {}, "error");
      return NextResponse.json(
        { message: "와인 메뉴 분석 결과를 처리하지 못했습니다." },
        { status: 502 },
      );
    }

    // 카탈로그 제외 플래그가 켜져 있으면 와인 DB(카탈로그) 매칭 데이터(isCatalogMatched)를 빼고
    // 순수 OCR 추출 항목만 내려준다.
    const wines = isCatalogExcluded()
      ? parsed.data.wines.filter((wine) => !wine.isCatalogMatched)
      : parsed.data.wines;

    log.event("extraction.completed", {
      wineCount: wines.length,
      excludeCatalog: isCatalogExcluded(),
    });
    return NextResponse.json({ wines });
  },
);

/** 백엔드 오류 body와 내부 URL을 노출하지 않고 status 중심으로 safe message를 만든다. */
function mapExtractError(status: number): string {
  switch (status) {
    case 400:
      return "이미지 형식이 올바르지 않습니다. PNG 또는 JPEG 이미지를 첨부해 주세요.";
    case 409:
      return "이미 진행 중인 세션입니다. 처음부터 다시 시도해 주세요.";
    case 413:
      return "이미지 용량이 너무 큽니다. 더 작은 이미지를 첨부해 주세요.";
    default:
      return "와인 메뉴 이미지 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}
