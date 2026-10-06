import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
vi.mock("server-only", () => ({}));
import { POST } from "./route";

const TEST_CODE = "valid-beta-code";
const TEST_SECRET = "test-secret-that-is-at-least-32-bytes-long";

describe("POST /api/beta-auth", () => {
  beforeEach(() => {
    process.env.BETA_ACCESS_CODE = TEST_CODE;
    process.env.BETA_JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.BETA_ACCESS_CODE;
    delete process.env.BETA_JWT_SECRET;
    vi.restoreAllMocks();
  });

  it("sets HttpOnly access and refresh cookies for a valid access code", async () => {
    const response = await POST(createRequest(TEST_CODE));
    if (!(response instanceof NextResponse))
      throw new Error("Expected a NextResponse with cookies");
    const body = await response.json();
    const accessCookie = response.cookies.get("beta_access");
    const refreshCookie = response.cookies.get("beta_refresh");

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(JSON.stringify(body)).not.toContain("token");
    expect(accessCookie).toMatchObject({
      name: "beta_access",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
    expect(refreshCookie).toMatchObject({
      name: "beta_refresh",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    expect(accessCookie?.value).toBeTruthy();
    expect(refreshCookie?.value).toBeTruthy();
  });

  it("returns 401 without setting a cookie for an invalid code", async () => {
    const response = await POST(createRequest("wrong-code"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "유효하지 않은 접근 코드입니다.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns 400 for a non-JSON request", async () => {
    const response = await POST(
      new Request("http://localhost/api/beta-auth", {
        method: "POST",
        body: TEST_CODE,
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns a safe 500 response when the access code is missing", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    delete process.env.BETA_ACCESS_CODE;

    const response = await POST(createRequest(TEST_CODE));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      message: "인증을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET);
    expect(
      consoleError.mock.calls.map(([entry]) => JSON.parse(entry).event),
    ).toContain("auth.configuration.missing");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(TEST_SECRET);
  });

  it("returns a safe 500 response when the JWT secret is invalid", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    process.env.BETA_JWT_SECRET = "short";

    const response = await POST(createRequest(TEST_CODE));

    expect(response.status).toBe(500);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(
      consoleError.mock.calls.map(([entry]) => JSON.parse(entry).event),
    ).toContain("auth.configuration.invalid");
  });
});

function createRequest(code: string): Request {
  return new Request("http://localhost/api/beta-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}
