import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/auth/beta-request", async (original) => ({
  ...await original<typeof import("@/lib/auth/beta-request")>(),
  hasValidBetaAccess: vi.fn().mockResolvedValue(true),
}));
import { hasValidBetaAccess } from "@/lib/auth/beta-request";
import { POST } from "./route";
import { GET } from "../status/route";

afterEach(() => { vi.mocked(hasValidBetaAccess).mockResolvedValue(true); vi.unstubAllEnvs(); });

function request(origin = "http://localhost", cookie?: string) {
  return new NextRequest("http://localhost/api/intro/complete", {
    method: "POST", headers: { origin, ...(cookie ? { cookie } : {}) },
  });
}

describe("intro routes", () => {
  it("sets a 24-hour HttpOnly cookie only on completion", async () => {
    const response = await POST(request());
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.cookies.get("isFirstVisit")).toMatchObject({
      value: "false", maxAge: 86400, httpOnly: true, sameSite: "lax", path: "/",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("sets Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request())).cookies.get("isFirstVisit")?.secure).toBe(true);
  });
  it("rejects cross-site completion", async () => {
    const response = await POST(request("https://evil.example"));
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("accepts the incoming loopback Host even when Next normalizes nextUrl", async () => {
    const response = await POST(new NextRequest("http://localhost:3000/api/intro/complete", {
      method: "POST", headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
    }));
    expect(response.status).toBe(204);
  });
  it("rejects missing Origin", async () => {
    expect((await POST(new NextRequest("http://localhost/api/intro/complete", { method: "POST" }))).status).toBe(403);
  });
  it("rejects unauthenticated completion and status", async () => {
    vi.mocked(hasValidBetaAccess).mockResolvedValue(false);
    expect((await POST(request())).status).toBe(401);
    expect((await GET(request())).status).toBe(401);
  });
  it.each([
    [undefined, true], ["isFirstVisit=true", true], ["isFirstVisit=false", false],
  ])("reads status without writing a cookie (%s)", async (cookie, isFirstVisit) => {
    const response = await GET(request("http://localhost", cookie));
    expect(await response.json()).toEqual({ isFirstVisit });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
