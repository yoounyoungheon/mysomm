import { NextRequest, NextResponse } from "next/server";
import { INTRO_COOKIE_NAME, INTRO_MAX_AGE_SECONDS } from "@/lib/intro/intro-policy";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // No arbitrary body/cookie values or cross-site writes are accepted.
  // Next dev normalizes loopback nextUrl hosts to localhost. Compare the
  // browser's Origin with the incoming Host, not that normalized hostname.
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
  if (request.headers.get("origin") !== expectedOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, {
      status: 403, headers: { "Cache-Control": "no-store" },
    });
  }
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(INTRO_COOKIE_NAME, "false", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: INTRO_MAX_AGE_SECONDS,
  });
  return response;
}
