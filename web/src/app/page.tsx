import type { Metadata } from "next";
import HomeView from "@/app/feature/home/ui/HomeView";

export const metadata: Metadata = {
  title: "마이쏨 | 메뉴에 어울리는 와인",
};

export default function Home() {
  return <HomeView />;
}
