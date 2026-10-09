import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import WineRecommendationCarouselA from "./WineRecommendationCarouselA";
import type { PairingSlideView } from "../model/conversation.types";

function slide(rank: number, name: string): PairingSlideView {
  return {
    imageUrl: "/ExampleImage.png",
    rank: String(rank),
    name,
    comment: "부드러운 레드와인이 필요하다면 이 친구로",
    reason:
      "된장의 감칠맛이 와인의 과실향을 더 또렷하게 만들어줌. 부담 없이 마시기 좋음.",
    wine: null,
    isCommitted: true,
  };
}

const meta: Meta<typeof WineRecommendationCarouselA> = {
  title: "Feature/wine-pairing-chat/WineRecommendationCarouselA",
  component: WineRecommendationCarouselA,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    slides: {
      control: "object",
      description: "캐러셀에 표시할 추천 와인 슬라이드 목록입니다.",
    },
    className: {
      control: "text",
      description: "캐러셀에 추가할 className입니다.",
    },
  },
  render: (args) => (
    <div className="w-[314px] bg-background-03 p-4">
      <WineRecommendationCarouselA {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof WineRecommendationCarouselA>;

export const SingleSlide: Story = {
  args: {
    slides: [slide(1, "샤또 라 로즈 드 비트락 루즈 2020")],
  },
};

export const ThreeSlides: Story = {
  args: {
    slides: [
      slide(1, "샤또 라 로즈 드 비트락 루즈 2020"),
      slide(2, "몬테스 알파 카베르네 소비뇽"),
      slide(3, "클라우디 베이 소비뇽 블랑"),
    ],
  },
};

export const StreamingPainting: Story = {
  args: {
    slides: [
      slide(1, "샤또 라 로즈 드 비트락 루즈 2020"),
      {
        imageUrl: "/ExampleImage.png",
        rank: "2",
        name: "몬테스 알파",
        comment: "",
        reason: "",
        wine: null,
        isCommitted: false,
      },
    ],
  },
};
