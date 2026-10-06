import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import SkeletonList from "./skeleton-list";

const meta: Meta<typeof SkeletonList> = {
  title: "Components/SkeletonList",
  component: SkeletonList,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    label: {
      control: "text",
      description: "보조 기술에 전달할 로딩 안내 문구입니다.",
    },
    className: {
      control: "text",
      description: "패널 크기 및 외형을 조정합니다.",
    },
    variant: {
      control: "select",
      options: ["menu", "wine"],
      description: "메뉴 카테고리 또는 와인 생성 대기 디자인입니다.",
    },
  },
  args: {
    label: "어울리는 메뉴를 찾고 있어요.",
    variant: "menu",
    className: "w-[360px] max-w-full",
  },
};

export default meta;
type Story = StoryObj<typeof SkeletonList>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByRole("status");
    await expect(panel).toHaveAttribute("aria-busy", "true");
    await expect(panel.querySelectorAll(".animate-pulse")).toHaveLength(12);
    await expect(panel.querySelector("svg")).not.toBeInTheDocument();
  },
};
export const Wine: Story = {
  args: { label: "어울리는 와인을 찾고 있어요.", variant: "wine" },
};
