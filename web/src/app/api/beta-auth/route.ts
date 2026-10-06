import { NextResponse } from "next/server";
import { withServerRequestLog } from "@/app/utils/http/server-log";
import { z } from "zod";
import {
  BETA_ACCESS_COOKIE_NAME,
  BETA_ACCESS_MAX_AGE_SECONDS,
  BETA_REFRESH_COOKIE_NAME,
  BETA_REFRESH_MAX_AGE_SECONDS,
  BetaAuthConfigurationError,
  createBetaAccessToken,
  createBetaRefreshToken,
} from "@/lib/auth/beta-token";

const BetaAuthRequestSchema = z.object({
  code: z.string().min(1).max(256),
});

const INVALID_CODE_MESSAGE = "유효하지 않은 접근 코드입니다.";
const SERVER_ERROR_MESSAGE =
  "인증을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export const POST = withServerRequestLog(
  "beta.auth",
  async (request: Request, log) => {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return jsonResponse({ message: "요청 형식이 올바르지 않습니다." }, 400);
    }

    const parsed = BetaAuthRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return jsonResponse({ message: "접근 코드를 입력해 주세요." }, 400);
    }

    const accessCode = process.env.BETA_ACCESS_CODE;
    log.event("validation.passed");
    if (!accessCode) {
      log.event("auth.configuration.missing", {}, "error");
      return jsonResponse({ message: SERVER_ERROR_MESSAGE }, 500);
    }

    if (parsed.data.code !== accessCode) {
      log.event("auth.code.rejected", {}, "warn");
      return jsonResponse({ message: INVALID_CODE_MESSAGE }, 401);
    }

    try {
      log.event("auth.code.accepted");
      log.event("auth.tokens.started");
      const [accessToken, refreshToken] = await Promise.all([
        createBetaAccessToken(),
        createBetaRefreshToken(),
      ]);
      const response = jsonResponse({ ok: true }, 200);
      response.cookies.set({
        name: BETA_ACCESS_COOKIE_NAME,
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: BETA_ACCESS_MAX_AGE_SECONDS,
      });
      response.cookies.set({
        name: BETA_REFRESH_COOKIE_NAME,
        value: refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: BETA_REFRESH_MAX_AGE_SECONDS,
      });
      log.event("auth.tokens.completed");
      return response;
    } catch (error) {
      if (error instanceof BetaAuthConfigurationError) {
        log.event("auth.configuration.invalid", {}, "error");
      } else {
        log.error("auth.tokens.failed", error);
      }
      return jsonResponse({ message: SERVER_ERROR_MESSAGE }, 500);
    }
  },
);

function jsonResponse(
  body: { ok: true } | { message: string },
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
