import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import DisclosureCard from "./disclosure-card";

const meta: Meta<typeof DisclosureCard> = {
  title: "Components/DisclosureCard",
  component: DisclosureCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    title: "설명 보기",
    description: "버튼을 눌러 확인하세요",
    children: <p>상세 설명입니다.</p>,
  },
  render: (args) => (
    <div className="w-[320px] max-w-full">
      <DisclosureCard {...args} />
    </div>
  ),
};
export default meta;
type Story = StoryObj<typeof DisclosureCard>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvasElement.querySelector("summary")!;
    await expect(canvas.getByText("상세 설명입니다.")).not.toBeVisible();
    await userEvent.click(summary);
    await expect(canvasElement.querySelector("details")).toHaveAttribute(
      "open",
    );
    await expect(canvas.getByText("상세 설명입니다.")).toBeVisible();
    await userEvent.click(summary);
    await expect(canvasElement.querySelector("details")).not.toHaveAttribute(
      "open",
    );
    await userEvent.click(summary);
    await expect(canvas.getByText("상세 설명입니다.")).toBeVisible();
  },
};
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector("summary")).toBeNull();
  },
};
export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector("summary")!);
  },
};
export const LongContent: Story = {
  args: {
    children: (
      <p className="break-words">
        {"긴 설명이 자연스럽게 줄바꿈됩니다. ".repeat(20)}
      </p>
    ),
  },
};
