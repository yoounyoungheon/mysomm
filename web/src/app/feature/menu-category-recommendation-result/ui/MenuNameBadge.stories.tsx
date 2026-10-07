import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MenuNameBadge from "./MenuNameBadge";

const meta: Meta<typeof MenuNameBadge> = {
  title: "Feature/menu-category-recommendation-result/MenuNameBadge",
  component: MenuNameBadge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    name: { control: "text" },
    iconSrc: {
      control: "text",
      description: "뱃지 안에 표시할 18px 음식 아이콘 경로",
    },
    isSelected: { control: "boolean" },
    onToggle: { action: "toggle", control: false },
  },
  args: {
    name: "해산물 파전",
    isSelected: false,
  },
  render: (args) => (
    <div className="bg-background-03 p-4">
      <MenuNameBadge {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof MenuNameBadge>;

export const Default: Story = {};

export const Selected: Story = {
  args: { isSelected: true },
};

export const LongName: Story = {
  args: {
    name: "제철 해산물 모둠과 마늘 오일 바게트를 곁들인 지중해식 플래터",
  },
};
export const WithIcon: Story = {
  args: { iconSrc: "/images/menu-category/seafood.png" },
};
