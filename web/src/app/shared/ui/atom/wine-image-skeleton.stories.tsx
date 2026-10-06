import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import WineImageSkeleton from "./wine-image-skeleton";

const meta: Meta<typeof WineImageSkeleton> = {
  title: "Components/WineImageSkeleton",
  component: WineImageSkeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    className: {
      control: "text",
      description: "와인병 점 행렬 이미지의 표시 크기를 지정합니다.",
    },
  },
  args: { className: "h-[144px] w-[72px]" },
};
export default meta;
type Story = StoryObj<typeof WineImageSkeleton>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg?.querySelectorAll("circle")).toHaveLength(984);
    // The reference has a narrow neck, straight body, and a broad flat base.
    const bottleDots = svg!.querySelectorAll("circle[class]");
    const dotsAt = (y: string) => Array.from(bottleDots).filter((dot) => dot.getAttribute("cy") === y).length;
    await expect(dotsAt("30")).toBeLessThan(dotsAt("102"));
    await expect(dotsAt("102")).toBe(dotsAt("138"));
    await expect(dotsAt("146")).toBeGreaterThanOrEqual(6);
  },
};
export const Large: Story = { args: { className: "h-[240px] w-[144px]" } };
