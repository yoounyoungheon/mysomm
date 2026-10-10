import type { Metadata } from "next";
import { cookies } from "next/headers";
import HomeView from "@/app/feature/home/ui/HomeView";
import IntroDialog from "@/app/feature/home/ui/IntroDialog";
import { INTRO_COOKIE_NAME, shouldShowIntro } from "@/lib/intro/intro-policy";

export const metadata: Metadata = {
  title: "마이쏨 | 메뉴에 어울리는 와인",
};

export default async function Home() {
  const cookieStore = await cookies();
  return (
    <>
      <HomeView />
      <IntroDialog shouldShowIntro={shouldShowIntro(cookieStore.get(INTRO_COOKIE_NAME)?.value)} />
    </>
  );
}
