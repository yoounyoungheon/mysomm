import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import SelectionBadge from "./selection-badge";
import { Utensils } from "lucide-react";

const meta: Meta<typeof SelectionBadge> = {
  title: "Components/SelectionBadge",
  component: SelectionBadge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    label: { control: "text", description: "선택할 항목 이름" },
    icon: {
      control: false,
      description: "뱃지 버튼 내부의 장식용 작은 아이콘",
    },
    selected: { control: "boolean", description: "aria-pressed와 선택 스타일" },
    onToggle: { action: "toggle", control: false },
    onRemove: { action: "remove", control: false },
  },
  args: { label: "해산물 파전", selected: false, onToggle: fn() },
  render: (args) => (
    <div className="w-[280px] max-w-full bg-background-03 p-3">
      <SelectionBadge {...args} />
    </div>
  ),
};
export default meta;
type Story = StoryObj<typeof SelectionBadge>;
export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const WithIcon: Story = {
  args: { icon: <Utensils className="h-[18px] w-[18px]" /> },
};
export const Removable: Story = {
  args: { selected: true, onRemove: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "해산물 파전 삭제" }),
    );
    await expect(args.onRemove).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
};
export const LongLabel: Story = {
  args: {
    label: "제철해산물과마늘오일바게트를곁들인아주긴이름의지중해식플래터",
    onRemove: fn(),
  },
};
