import { NextResponse, type NextRequest } from "next/server";
import {
  BETA_ACCESS_COOKIE_NAME,
  BETA_REFRESH_COOKIE_NAME,
  BetaAuthConfigurationError,
  readBetaAccessToken,
  readBetaRefreshToken,
  type BetaTokenClaims,
} from "./beta-token";

export async function hasValidBetaAccess(
  request: NextRequest,
): Promise<boolean> {
  return (await readBetaAccess(request)) !== null;
}

export function readBetaAccess(
  request: NextRequest,
): Promise<BetaTokenClaims | null> {
  return readBetaToken(request, BETA_ACCESS_COOKIE_NAME, readBetaAccessToken);
}

export async function hasValidBetaRefresh(
  request: NextRequest,
): Promise<boolean> {
  return (await readBetaRefresh(request)) !== null;
}

export function readBetaRefresh(
  request: NextRequest,
): Promise<BetaTokenClaims | null> {
  return readBetaToken(request, BETA_REFRESH_COOKIE_NAME, readBetaRefreshToken);
}

async function readBetaToken(
  request: NextRequest,
  cookieName: string,
  verifyToken: (token: string) => Promise<BetaTokenClaims | null>,
): Promise<BetaTokenClaims | null> {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) {
    return null;
  }

  try {
    return await verifyToken(token);
  } catch (error) {
    if (error instanceof BetaAuthConfigurationError) {
      console.error("[beta-auth] BETA_JWT_SECRET is not configured correctly.");
    }
    return null;
  }
}

export function createBetaUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { message: "베타 접근 인증이 필요합니다." },
    {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
