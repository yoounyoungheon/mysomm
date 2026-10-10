export const INTRO_COOKIE_NAME = "isFirstVisit";
export const INTRO_MAX_AGE_SECONDS = 24 * 60 * 60;
export const INTRO_DURATION_MS = 1000;
export const INTRO_STORAGE_KEY = "mysomm:intro-closed-at";

export function shouldShowIntro(cookieValue: string | undefined): boolean {
  return cookieValue !== "false";
}

export function wasIntroClosedRecently(value: string | null, now = Date.now()): boolean {
  if (!value) return false;
  const closedAt = Number(value);
  return Number.isFinite(closedAt) && closedAt > 0 && closedAt <= now &&
    now - closedAt < INTRO_MAX_AGE_SECONDS * 1000;
}
