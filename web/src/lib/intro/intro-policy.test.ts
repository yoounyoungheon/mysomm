import { describe, expect, it } from "vitest";
import { INTRO_MAX_AGE_SECONDS, shouldShowIntro, wasIntroClosedRecently } from "./intro-policy";

describe("intro policy", () => {
  it.each([undefined, "true", "", "invalid"])("shows intro for %s", (value) => {
    expect(shouldShowIntro(value)).toBe(true);
  });
  it("only the exact false string suppresses the intro", () => {
    expect(shouldShowIntro("false")).toBe(false);
    expect(INTRO_MAX_AGE_SECONDS).toBe(86400);
  });
  it("expires the tab fallback after exactly 24 hours", () => {
    const closedAt = 1000;
    expect(wasIntroClosedRecently(String(closedAt), closedAt + 86399999)).toBe(true);
    expect(wasIntroClosedRecently(String(closedAt), closedAt + 86400000)).toBe(false);
  });
  it.each([null, "", "invalid", "Infinity", "0", "-1", "2000"])("rejects invalid/future tab timestamps %s", (value) => {
    expect(wasIntroClosedRecently(value, 1000)).toBe(false);
  });
});
