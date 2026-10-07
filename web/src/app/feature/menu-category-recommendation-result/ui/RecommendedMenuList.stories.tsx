import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import type { RecommendedMenu } from "@/app/entity/menu-category-recommendation/model/menu-category-recommendation.type";
import RecommendedMenuList from "./RecommendedMenuList";

// 같은 category가 그루핑되도록 섞인 순서로 구성한다.
const menus: RecommendedMenu[] = [
  { name: "해산물 파전", category: "해산물" },
  { name: "바지락 오일 파스타", category: "파스타 및 면" },
  { name: "안심 스테이크", category: "붉은 고기" },
  { name: "감바스", category: "해산물" },
  { name: "명란 크림 파스타", category: "파스타 및 면" },
  { name: "부라타 치즈 샐러드", category: "치즈" },
  { name: "가르니 디저트 플레이트", category: "디저트" },
];

const meta: Meta<typeof RecommendedMenuList> = {
  title: "Feature/menu-category-recommendation-result/RecommendedMenuList",
  component: RecommendedMenuList,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    menus: { control: "object" },
    selectedNames: { control: "object" },
    onToggleName: { action: "toggle", control: false },
  },
  args: {
    menus,
    selectedNames: ["바지락 오일 파스타"],
  },
  render: (args) => (
    <div className="w-[390px] max-w-full bg-background-03 p-4">
      <RecommendedMenuList {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof RecommendedMenuList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const short = canvas.getByRole("button", { name: "감바스" });
    const long = canvas.getByRole("button", { name: "해산물 파전" });
    expect(short.getBoundingClientRect().width).toBeLessThan(
      long.getBoundingClientRect().width,
    );
    expect(
      getComputedStyle(short.parentElement!.parentElement!.parentElement!)
        .flexWrap,
    ).toBe("wrap");
  },
};

export const LongName: Story = {
  args: {
    menus: [
      {
        name: "아주 긴 이름의 음식도 화면 바깥으로 넘치지 않고 뱃지 안에서 자연스럽게 줄바꿈되는 추천 메뉴",
        category: "붉은 고기",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole("list");
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
  },
};

export const SingleCategory: Story = {
  args: {
    menus: [
      { name: "해산물 파전", category: "해산물" },
      { name: "감바스", category: "해산물" },
    ],
    selectedNames: [],
  },
};

export const NoneSelected: Story = {
  args: { selectedNames: [] },
};
