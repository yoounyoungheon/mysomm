import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import type { PairingSlideView } from "../model/conversation.types";
import WineRecommendationCarouselA from "./WineRecommendationCarouselA";
import WineRecommendationCarouselB from "./WineRecommendationCarouselB";

const slide: PairingSlideView = {
  rank: "1",
  name: "도멘 드 라 로마네 꽁띠, 로마네 꽁띠",
  comment: "돼지갈비와 조금 더 편안하게 맞춰볼 수 있어요",
  reason:
    "같은 와인이지만 가격과 정보상 큰 차이는 드러나지 않아요. 음식의 풍미와 와인의 산도가 잘 어울려요.",
  imageUrl: "",
  isCommitted: true,
  wine: {
    id: "11111111-1111-4111-8111-111111111111",
    wineName: "도멘 드 라 로마네 꽁띠, 로마네 꽁띠",
    vintage: 2019,
    alcohol: "13%",
    price: null,
    country: "프랑스",
    region: "부르고뉴 > 꼬뜨 드 뉘 > 본 로마네",
    body: 4,
    sweetness: 0,
    tannin: 3,
    acid: 4,
    wineBottleImageUrl: null,
  },
};
const meta: Meta<typeof WineRecommendationCarouselB> = {
  title: "Feature/wine-pairing-chat/WineRecommendationCarouselB",
  component: WineRecommendationCarouselB,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { slides: [slide] },
  render: (args) => (
    <div className="w-[390px] max-w-full bg-background-03 py-4">
      <WineRecommendationCarouselB {...args} />
    </div>
  ),
};
export default meta;
type Story = StoryObj<typeof WineRecommendationCarouselB>;
const summaryAtLimit = "갈비찜과는 부드럽게 이어지는 쪽으로 좋아요.";

export const Summary23Characters: Story = {
  args: { slides: [{ ...slide, comment: summaryAtLimit.slice(0, -1) }] },
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector("h3")!;
    expect(Array.from(heading.textContent!).length).toBe(23);
    expect(getComputedStyle(heading).fontSize).toBe("23px");
  },
};
export const Summary24Characters: Story = {
  args: { slides: [{ ...slide, comment: summaryAtLimit }] },
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector("h3")!;
    expect(heading.textContent).toBe(summaryAtLimit);
    expect(Array.from(heading.textContent!).length).toBe(24);
    expect(getComputedStyle(heading).fontSize).toBe("23px");
  },
};
export const Summary25Characters: Story = {
  args: { slides: [{ ...slide, comment: `${summaryAtLimit}!` }] },
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector("h3")!;
    expect(Array.from(heading.textContent!).length).toBe(25);
    expect(getComputedStyle(heading).fontSize).toBe("20px");
  },
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: /이 와인 자세히 보기/ });
    await expect(link).toHaveAttribute("href", "https://www.wine21.com/");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(canvas.getByText(slide.reason)).not.toBeVisible();
    await userEvent.click(canvasElement.querySelector("summary")!);
    await expect(canvas.getByText(slide.reason)).toBeVisible();
    await expect(
      canvasElement.querySelector("[data-taste-field=sweetness] [role=img]"),
    ).toHaveAttribute("aria-label", "당도 0/5");
    expect(
      canvasElement.querySelectorAll(
        "[data-taste-field=sweetness] .bg-primary",
      ),
    ).toHaveLength(0);
  },
};
export const Multiple: Story = {
  args: {
    slides: [
      slide,
      {
        ...slide,
        rank: "2",
        name: "두 번째 와인",
        wine: { ...slide.wine!, wineName: "두 번째 와인" },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const viewport = within(canvasElement).getByRole("region", {
      name: "추천 와인 캐러셀",
    });
    const first = viewport.children[0].getBoundingClientRect();
    const second = viewport.children[1].getBoundingClientRect();
    expect(first.width).toBe(viewport.getBoundingClientRect().width);
    expect(second.left).toBeGreaterThanOrEqual(
      viewport.getBoundingClientRect().right,
    );
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "2번째 추천 보기" }),
    );
    await waitFor(() =>
      expect(
        within(canvasElement).getByRole("button", { name: "2번째 추천 보기" }),
      ).toHaveAttribute("aria-current", "true"),
    );
  },
};
export const NullMetadata: Story = {
  args: {
    slides: [
      {
        ...slide,
        wine: {
          ...slide.wine!,
          vintage: null,
          alcohol: " ",
          body: null,
          sweetness: null,
          tannin: null,
          acid: null,
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByText("준비중입니다.")).toHaveLength(4);
    expect(canvasElement.querySelectorAll("[data-taste-dot]")).toHaveLength(20);
    expect(
      canvasElement.querySelectorAll("[data-taste-dot].bg-primary"),
    ).toHaveLength(0);
    for (const dots of canvasElement.querySelectorAll(
      "[data-taste-field] [role=img]",
    ))
      expect(dots.getAttribute("aria-label")).toContain("정보 준비중");
    expect(canvasElement.querySelectorAll("strong")).toHaveLength(2);
    for (const value of canvasElement.querySelectorAll("strong"))
      expect(value.textContent).toBe("-");
  },
};
export const Empty: Story = { args: { slides: [] } };
export const Streaming: Story = {
  args: { slides: [{ ...slide, wine: null, isCommitted: false, reason: "" }] },
  play: async ({ canvasElement }) => {
    expect(
      canvasElement.querySelector("[data-wine-image-skeleton]"),
    ).not.toBeNull();
    expect(canvasElement.querySelector("summary")).toBeNull();
    await expect(
      within(canvasElement).getByRole("button", {
        name: "추천 완료 후 와인 자세히 보기",
      }),
    ).toBeDisabled();
  },
};
export const NoImage: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector("img[src='/images/wines/wine-bottle.png']"),
    ).toHaveAttribute("src", "/images/wines/wine-bottle.png");
    await expect(
      within(canvasElement).getByText("이미지 준비중"),
    ).toBeVisible();
  },
};
export const ActualImage: Story = {
  args: {
    slides: [
      {
        ...slide,
        wine: {
          ...slide.wine!,
          wineBottleImageUrl: "/images/wines/wine-bottle.png",
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).queryByText("이미지 준비중")).toBeNull();
  },
};
export const LongReason: Story = {
  args: {
    slides: [
      {
        ...slide,
        reason: slide.reason.repeat(12),
        name: slide.name.repeat(3),
        wine: { ...slide.wine!, wineName: slide.name.repeat(3) },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector("summary")!);
    const article = canvasElement.querySelector("article")!;
    expect(article.scrollWidth).toBeLessThanOrEqual(article.clientWidth);
  },
};
export const StreamUpdatesKeepOpen: Story = {
  render: function StreamUpdateExample() {
    const [committed, setCommitted] = useState(false);
    return (
      <div className="w-[390px] max-w-full bg-background-03">
        <button onClick={() => setCommitted(true)}>최종 데이터 수신</button>
        <WineRecommendationCarouselB
          slides={[
            {
              ...slide,
              wine: committed ? slide.wine : null,
              isCommitted: committed,
              reason: committed ? slide.reason : "같은 와인이지만",
            },
          ]}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvasElement.querySelector("summary")!);
    await userEvent.click(
      canvas.getByRole("button", { name: "최종 데이터 수신" }),
    );
    await expect(canvasElement.querySelector("details")).toHaveAttribute(
      "open",
    );
    await expect(canvas.getByText(slide.reason)).toBeVisible();
    expect(
      canvasElement.querySelector("[data-wine-image-skeleton]"),
    ).toBeNull();
  },
};
export const CompareAB: Story = {
  render: (args) => (
    <div className="flex w-[820px] max-w-full flex-wrap gap-4 bg-background-03 p-4">
      <section className="w-[390px] max-w-full">
        <h2>A</h2>
        <WineRecommendationCarouselA {...args} />
      </section>
      <section className="w-[390px] max-w-full">
        <h2>B</h2>
        <WineRecommendationCarouselB {...args} />
      </section>
    </div>
  ),
};
