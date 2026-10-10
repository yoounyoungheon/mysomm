import { NextRequest, NextResponse } from "next/server";
import { INTRO_COOKIE_NAME, shouldShowIntro } from "@/lib/intro/intro-policy";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ isFirstVisit: shouldShowIntro(request.cookies.get(INTRO_COOKIE_NAME)?.value) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
