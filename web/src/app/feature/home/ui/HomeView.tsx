"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  Camera,
  ChevronRight,
  Home,
  Search,
  User,
} from "lucide-react";
import { cn } from "@/app/utils/style/helper";

const COMING_SOON_MESSAGE = "곧 출시 예정이니, 기다려주세요!";
const TOAST_DURATION_MS = 2500;

/**
 * 애플리케이션 메인(홈) 화면.
 *
 * 제공된 시안(라이트 배경 + 히어로 카피 + 2개 그라데이션 추천 카드 + 취향 프로필/빠른 채우기
 * 섹션 + 하단 3탭)을 현재 앱의 violet 색 컨셉으로 재구성했다(시안의 핑크는 violet 2톤으로 대체).
 *
 * 현재 실제 동작하는 진입점은 "사진으로 추천받기"(→ `/wine/list`)뿐이며,
 * 그 외 미구현 기능은 클릭 시 하단 "곧 출시 예정" 토스트를 띄운다.
 */
export default function HomeView() {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nonceRef = useRef(0);

  const notifyComingSoon = useCallback(() => {
    nonceRef.current += 1;
    setToast({ message: COMING_SOON_MESSAGE, id: nonceRef.current });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-canvas bg-violet-haze text-ink-page">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-8 px-5 pb-28 pt-4">
          <TopBar onComingSoon={notifyComingSoon} />
          <Hero />
          <FeatureCards onComingSoon={notifyComingSoon} />
          <TasteProfileSection onComingSoon={notifyComingSoon} />
          <QuickPreferenceSection onComingSoon={notifyComingSoon} />
        </div>
      </main>

      <BottomNav onComingSoon={notifyComingSoon} />
      <Toast toast={toast} />
    </div>
  );
}

function TopBar({ onComingSoon }: { onComingSoon: () => void }) {
  return (
    <header className="flex items-center justify-between">
      <span className="text-[22px] font-extrabold tracking-tight text-primary">
        MYSOMM
      </span>
      <div className="flex items-center gap-2">
        <IconCircleButton
          label="알림"
          icon={<Bell className="h-5 w-5" strokeWidth={2} />}
          onClick={onComingSoon}
        />
        <IconCircleButton
          label="내 정보"
          icon={<User className="h-5 w-5" strokeWidth={2} />}
          onClick={onComingSoon}
        />
      </div>
    </header>
  );
}

function IconCircleButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/[0.12] text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(110,58,245,0.08),0_10px_28px_rgba(72,52,112,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-colors hover:bg-white/[0.2]"
    >
      {icon}
    </button>
  );
}

function Hero() {
  return (
    <section>
      <p className="text-[13px] font-bold text-primary">오늘도 실패 없는 한 잔</p>
      <h1 className="mt-2 text-[28px] font-extrabold leading-[1.28] text-ink-page">
        취향에 맞는 와인,
        <br />
        마이쏨이 골라드릴게요
      </h1>
      <p className="mt-4 text-[14px] font-medium leading-relaxed text-ink-secondary">
        메뉴판과 와인 이름만 있으면
        <br />
        지금 가장 잘 어울리는 한 병을 찾아드려요.
      </p>
    </section>
  );
}

function FeatureCards({ onComingSoon }: { onComingSoon: () => void }) {
  return (
    <section aria-label="추천 받기" className="grid grid-cols-2 gap-3">
      {/* 실제 동작하는 유일한 진입점 */}
      <FeatureCard
        href="/wine/list"
        title={
          <>
            사진으로
            <br />
            추천받기
          </>
        }
        caption="메뉴판 촬영"
        icon={<Camera className="h-6 w-6" strokeWidth={1.9} />}
        gradientClassName="bg-gradient-to-br from-[#6E3AF5] to-[#7C4DF7]"
      />
      <FeatureCard
        onClick={onComingSoon}
        title={
          <>
            검색으로
            <br />
            추천받기
          </>
        }
        caption="와인 이름 검색"
        icon={<Search className="h-6 w-6" strokeWidth={1.9} />}
        gradientClassName="bg-gradient-to-br from-[#A65BEF] to-[#B884F2]"
      />
    </section>
  );
}

function FeatureCard({
  href,
  onClick,
  title,
  caption,
  icon,
  gradientClassName,
}: {
  href?: string;
  onClick?: () => void;
  title: ReactNode;
  caption: string;
  icon: ReactNode;
  gradientClassName: string;
}) {
  const className = cn(
    "relative flex min-h-[184px] flex-col justify-between overflow-hidden rounded-[22px] border border-white/45 p-4 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-1px_0_rgba(255,255,255,0.15),0_16px_34px_rgba(72,52,112,0.18)]",
    gradientClassName
  );

  const body = (
    <>
      {/* 장식용 반투명 원 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 top-6 h-24 w-24 rounded-full bg-white/15"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -right-10 h-28 w-28 rounded-full bg-white/10"
      />

      <span className="relative flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/30 bg-white/20 text-white backdrop-blur-md">
        {icon}
      </span>

      <div className="relative">
        <p className="text-[17px] font-extrabold leading-[1.28]">{title}</p>
        <p className="mt-1 text-[12px] font-medium text-white/80">{caption}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

const TASTE_TAGS = [
  "산뜻한 산미",
  "부드러운 타닌",
  "드라이",
  "과일 향",
  "묵직한 바디",
] as const;

function TasteProfileSection({ onComingSoon }: { onComingSoon: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="회원님에 대해 더 알려주세요" onMore={onComingSoon} />

      <div className="rounded-[20px] border border-white/55 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(110,58,245,0.06),0_18px_42px_rgba(72,52,112,0.045)] backdrop-blur-2xl backdrop-saturate-150">
        <button
          type="button"
          onClick={onComingSoon}
          className="flex w-full items-center gap-3 text-left"
        >
          <EmojiBadge src="/images/emoji/wine_glass.png" alt="와인 잔" />
          <span className="min-w-0">
            <span className="block text-[15px] font-bold text-ink-card">
              취향 프로필을 완성해볼까요?
            </span>
            <span className="mt-0.5 block text-[13px] font-medium text-ink-muted">
              선택할수록 더 정확해져요
            </span>
          </span>
        </button>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary/10">
          <div className="h-full w-[32%] rounded-full bg-gradient-to-r from-[#8E72F3] to-[#6E3AF5]" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TASTE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={onComingSoon}
              className="rounded-full border border-white/70 bg-white/[0.12] px-3 py-1.5 text-[13px] font-bold text-ink-emphasis shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(110,58,245,0.08),0_10px_28px_rgba(72,52,112,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-colors hover:bg-white/[0.2]"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const QUICK_PREFERENCES = [
  {
    image: "/images/emoji/peach.png",
    alt: "복숭아",
    title: "달콤한 와인, 얼마나 좋아하세요?",
    caption: "단맛 선호도를 알려주세요",
  },
  {
    image: "/images/emoji/plate.png",
    alt: "식기",
    title: "자주 먹는 음식이 있나요?",
    caption: "음식과 잘 맞는 와인을 추천해요",
  },
  {
    image: "/images/emoji/bling.png",
    alt: "반짝임",
    title: "와인, 얼마나 친숙한가요?",
    caption: "설명 난이도까지 맞춰드릴게요",
  },
] as const;

function QuickPreferenceSection({
  onComingSoon,
}: {
  onComingSoon: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[18px] font-extrabold text-ink-page">
        내 취향 빠르게 채우기
      </h2>
      <div className="flex flex-col gap-2.5">
        {QUICK_PREFERENCES.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={onComingSoon}
            className="flex items-center gap-4 rounded-[18px] border border-white/55 bg-white/[0.04] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(110,58,245,0.06),0_18px_42px_rgba(72,52,112,0.045)] backdrop-blur-2xl backdrop-saturate-150 transition-colors hover:bg-white/[0.10]"
          >
            <EmojiBadge src={item.image} alt={item.alt} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-ink-card">
                {item.title}
              </span>
              <span className="mt-0.5 block text-[13px] font-medium text-ink-muted">
                {item.caption}
              </span>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-ink-muted"
              strokeWidth={2}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  onMore,
}: {
  title: string;
  onMore: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[18px] font-extrabold text-ink-page">{title}</h2>
      <button
        type="button"
        onClick={onMore}
        className="shrink-0 text-[13px] font-bold text-primary transition-colors hover:text-primary-action"
      >
        더 보기
      </button>
    </div>
  );
}

function EmojiBadge({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary/15 to-primary/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <Image
        src={src}
        alt={alt}
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
      />
    </span>
  );
}

function Toast({ toast }: { toast: { message: string; id: number } | null }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center px-5"
    >
      {toast ? (
        <div
          key={toast.id}
          className="max-w-full rounded-full border border-white/70 bg-white/80 px-5 py-3 text-center text-[13px] font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_36px_rgba(72,52,112,0.16)] backdrop-blur-2xl backdrop-saturate-150 animate-toast-in motion-reduce:animate-none"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function BottomNav({ onComingSoon }: { onComingSoon: () => void }) {
  return (
    <nav className="shrink-0 border-t border-white/70 bg-white/85 px-4 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(60,45,96,0.08)] backdrop-blur-2xl">
      <ul className="mx-auto flex w-full max-w-[520px] items-center justify-around">
        <BottomNavItem href="/" label="홈" icon={<Home className="h-5 w-5" />} active />
        <BottomNavItem
          label="탐색"
          icon={<Search className="h-5 w-5" />}
          onClick={onComingSoon}
        />
        <BottomNavItem
          label="내 와인"
          icon={<Bookmark className="h-5 w-5" />}
          onClick={onComingSoon}
        />
      </ul>
    </nav>
  );
}

function BottomNavItem({
  href,
  label,
  icon,
  active = false,
  onClick,
}: {
  href?: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex min-w-[64px] flex-col items-center gap-1 rounded-[12px] px-2 py-1 text-[11px] font-bold transition-colors",
    active ? "text-primary" : "text-ink-muted hover:text-ink-emphasis"
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={className}
        >
          <span aria-hidden>{icon}</span>
          {label}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          <span aria-hidden>{icon}</span>
          {label}
        </button>
      )}
    </li>
  );
}
