import { NextRequest, NextResponse } from "next/server";
import { withServerRequestLog } from "@/app/utils/http/server-log";
import { createBetaUnauthorizedResponse, hasValidBetaAccess } from "@/lib/auth/beta-request";

export const POST = withServerRequestLog("beta.enter", async (request: NextRequest, log) => {
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    log.event("origin.rejected", {}, "warn");
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, {
      status: 403, headers: { "Cache-Control": "private, no-store" },
    });
  }
  if (!(await hasValidBetaAccess(request))) {
    log.event("auth.rejected", {}, "warn");
    return createBetaUnauthorizedResponse();
  }
  log.event("auth.accepted");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
});
