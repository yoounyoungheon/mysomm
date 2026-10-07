import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import SelectedMenuCart from "./SelectedMenuCart";

const meta: Meta<typeof SelectedMenuCart> = {
  title: "Feature/menu-category-recommendation-result/SelectedMenuCart",
  component: SelectedMenuCart,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    selectedNames: {
      control: "object",
      description: "선택한 음식 목록. 개수는 목록에서 파생합니다.",
    },
    onRemove: { action: "remove", control: false },
  },
  args: { selectedNames: ["소·양고기", "떡볶이", "한우 등심 구이"] },
  render: function CartDemo(args) {
    const [names, setNames] = useState([...args.selectedNames]);
    return (
      <SelectedMenuCart
        selectedNames={names}
        onRemove={(name) => {
          args.onRemove?.(name);
          setNames((current) => current.filter((value) => value !== name));
        }}
      />
    );
  },
};
export default meta;
type Story = StoryObj<typeof SelectedMenuCart>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {
      name: "선택한 음식 보기, 3개",
    });
    const bounds = trigger.getBoundingClientRect();
    await expect(bounds.width).toBe(52);
    await expect(bounds.height).toBe(52);
    await expect(trigger).toHaveClass(
      "rounded-full",
      "bg-white/[0.08]",
      "text-ink-emphasis",
    );
    await expect(getComputedStyle(canvas.getByText("3")).position).toBe(
      "absolute",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "선택한 음식 보기, 3개" }),
    );
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(
      await body.findByRole("dialog", { name: "선택한 음식" }),
    );
    await userEvent.click(
      dialog.getByRole("button", { name: "떡볶이 선택 해제" }),
    );
    await expect(dialog.queryByText("떡볶이")).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "닫기" }));
    await expect(
      canvas.getByRole("button", { name: "선택한 음식 보기, 2개" }),
    ).toHaveFocus();
  },
};
export const Empty: Story = {
  args: { selectedNames: [] },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "선택한 음식 보기, 0개",
      }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText("선택한 음식이 없어요.")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
  },
};
export const LongName: Story = {
  args: {
    selectedNames: [
      "제철해산물과바게트를곁들인아주긴이름의지중해식플래터".repeat(3),
    ],
  },
};
