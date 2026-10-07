import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectionBadge from "../atom/selection-badge";
import IconBadgeRow from "./icon-badge-row";

const meta: Meta<typeof IconBadgeRow> = {
  title: "Components/IconBadgeRow",
  component: IconBadgeRow,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    iconSrc: { control: "text", description: "장식용 아이콘 경로" },
    label: { control: "text", description: "행의 접근성 이름" },
    children: { control: false, description: "줄바꿈되는 뱃지 또는 입력 UI" },
  },
  args: { iconSrc: "/images/menu-category/seafood.png", label: "해산물" },
  render: (args) => (
    <div className="w-[320px] max-w-full bg-background-03 p-3">
      <IconBadgeRow {...args} />
    </div>
  ),
};
export default meta;
type Story = StoryObj<typeof IconBadgeRow>;
export const Default: Story = {
  args: { children: <SelectionBadge label="해산물 파전" /> },
};
export const Wrapped: Story = {
  args: {
    children: (
      <>
        <SelectionBadge label="바지락 와인찜" selected />
        <SelectionBadge label="감바스" />
        <SelectionBadge label="제철 해산물과 바게트를 곁들인 플래터" />
      </>
    ),
  },
};
