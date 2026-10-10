import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { POST } from "./route";
import { createBetaAccessToken, createBetaRefreshToken } from "@/lib/auth/beta-token";

const origin = "http://localhost:3000";
function request(token?: string, requestOrigin = origin) {
  return new NextRequest(`${origin}/api/beta-auth/enter`, {
    method: "POST",
    headers: { origin: requestOrigin, ...(token ? { cookie: `beta_access=${token}` } : {}) },
  });
}
describe("POST /api/beta-auth/enter", () => {
  beforeEach(() => { process.env.BETA_JWT_SECRET = "test-secret-that-is-at-least-32-bytes-long"; });
  afterEach(() => { delete process.env.BETA_JWT_SECRET; });
  it.each(["A", "B"] as const)("accepts verified %s access without exposing tokens", async (variant) => {
    const response = await POST(request(await createBetaAccessToken(variant)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
  it("rejects missing access", async () => {
    expect((await POST(request())).status).toBe(401);
  });
  it("rejects malformed access", async () => {
    expect((await POST(request("invalid"))).status).toBe(401);
  });
  it("does not accept refresh as access", async () => {
    expect((await POST(request(await createBetaRefreshToken("A")))).status).toBe(401);
  });
  it("rejects cross-origin requests even with valid access", async () => {
    expect((await POST(request(await createBetaAccessToken("A"), "https://other.example"))).status).toBe(403);
  });
  it("rejects missing origin", async () => {
    const req = request(await createBetaAccessToken("A"));
    req.headers.delete("origin");
    expect((await POST(req)).status).toBe(403);
  });
});
