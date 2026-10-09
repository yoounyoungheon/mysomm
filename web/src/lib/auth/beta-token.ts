import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const BETA_ACCESS_COOKIE_NAME = "beta_access";
export const BETA_REFRESH_COOKIE_NAME = "beta_refresh";
export const BETA_ACCESS_MAX_AGE_SECONDS = 60 * 15;
export const BETA_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const BETA_TOKEN_ISSUER = "mysom-web";
export const BETA_ACCESS_TOKEN_AUDIENCE = "beta-access";
export const BETA_REFRESH_TOKEN_AUDIENCE = "beta-refresh";

const BETA_TOKEN_ALGORITHM = "HS256";
const MINIMUM_SECRET_BYTES = 32;
const BETA_ACCESS_TOKEN_TYPE = "beta-access";
const BETA_REFRESH_TOKEN_TYPE = "beta-refresh";

export type RecommendationVariant = "A" | "B";
export type BetaTokenClaims = { recommendationVariant: RecommendationVariant };

export class BetaAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BetaAuthConfigurationError";
  }
}

function getSecretKey(): Uint8Array {
  const secret = process.env.BETA_JWT_SECRET;

  if (!secret) {
    throw new BetaAuthConfigurationError("BETA_JWT_SECRET is not configured");
  }

  const encodedSecret = new TextEncoder().encode(secret);
  if (encodedSecret.byteLength < MINIMUM_SECRET_BYTES) {
    throw new BetaAuthConfigurationError(
      `BETA_JWT_SECRET must be at least ${MINIMUM_SECRET_BYTES} bytes`,
    );
  }

  return encodedSecret;
}

async function createBetaToken(
  type: string,
  audience: string,
  expirationTime: string,
  recommendationVariant: RecommendationVariant,
): Promise<string> {
  return new SignJWT({ type, recommendationVariant })
    .setProtectedHeader({ alg: BETA_TOKEN_ALGORITHM, typ: "JWT" })
    .setIssuer(BETA_TOKEN_ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(getSecretKey());
}

async function verifyBetaToken(
  token: string,
  type: string,
  audience: string,
): Promise<BetaTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: [BETA_TOKEN_ALGORITHM],
      issuer: BETA_TOKEN_ISSUER,
      audience,
      requiredClaims: ["iat", "exp"],
    });

    if (payload.type !== type) return null;
    const variant = payload.recommendationVariant;
    // Missing claims belong to legacy A sessions; malformed claims are rejected.
    if (variant === undefined) return { recommendationVariant: "A" };
    return variant === "A" || variant === "B"
      ? { recommendationVariant: variant }
      : null;
  } catch (error) {
    if (error instanceof BetaAuthConfigurationError) {
      throw error;
    }

    return null;
  }
}

export function createBetaAccessToken(
  recommendationVariant: RecommendationVariant = "A",
): Promise<string> {
  return createBetaToken(
    BETA_ACCESS_TOKEN_TYPE,
    BETA_ACCESS_TOKEN_AUDIENCE,
    "15m",
    recommendationVariant,
  );
}

export function createBetaRefreshToken(
  recommendationVariant: RecommendationVariant = "A",
): Promise<string> {
  return createBetaToken(
    BETA_REFRESH_TOKEN_TYPE,
    BETA_REFRESH_TOKEN_AUDIENCE,
    "7d",
    recommendationVariant,
  );
}

export function readBetaAccessToken(
  token: string,
): Promise<BetaTokenClaims | null> {
  return verifyBetaToken(
    token,
    BETA_ACCESS_TOKEN_TYPE,
    BETA_ACCESS_TOKEN_AUDIENCE,
  );
}

export function readBetaRefreshToken(
  token: string,
): Promise<BetaTokenClaims | null> {
  return verifyBetaToken(
    token,
    BETA_REFRESH_TOKEN_TYPE,
    BETA_REFRESH_TOKEN_AUDIENCE,
  );
}

export async function verifyBetaAccessToken(token: string): Promise<boolean> {
  return (await readBetaAccessToken(token)) !== null;
}

export async function verifyBetaRefreshToken(token: string): Promise<boolean> {
  return (await readBetaRefreshToken(token)) !== null;
}
