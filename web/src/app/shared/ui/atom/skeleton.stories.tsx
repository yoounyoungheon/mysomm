import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Skeleton from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Components/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    className: { control: "text", description: "스켈레톤 크기·모양을 지정합니다." },
  },
  args: { className: "h-[136px] w-[68px] rounded-[12px]" },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;
export const Default: Story = {};
export const TextLine: Story = { args: { className: "h-2.5 w-[240px] rounded-full" } };
