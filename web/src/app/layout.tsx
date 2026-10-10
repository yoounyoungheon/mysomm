import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "./utils/style/helper";
import Providers from "./providers";
import { cookies } from "next/headers";
import IntroDialog from "@/app/feature/intro/ui/IntroDialog";
import { INTRO_COOKIE_NAME, shouldShowIntro } from "@/lib/intro/intro-policy";

const globalFont = localFont({
  src: "./PretendardVariable.woff2",
  display: "swap",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "WaMaDae",
  description: "WaMaDae WEB",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  return (
    <html lang="ko" className="h-full overflow-hidden" suppressHydrationWarning>
      <body
        className={cn(
          globalFont.variable,
          "font-pretendard",
          "flex h-[100dvh] justify-center overflow-hidden bg-white"
        )}
      >
        <Providers>
          <div className="h-[100dvh] overflow-hidden bg-white">
            {/* 최대 폭(480px)만 제한하고 그 안에서는 viewport 폭에 반응형으로 채운다. */}
            <div id="app-content" tabIndex={-1} className="h-[100dvh] w-screen max-w-[480px] overflow-hidden bg-white pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] outline-none">
              {children}
            </div>
          </div>
          <IntroDialog shouldShowIntro={shouldShowIntro(cookieStore.get(INTRO_COOKIE_NAME)?.value)} />
        </Providers>
      </body>
    </html>
  );
}
