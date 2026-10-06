import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import PageHeader from "./page-header";

const meta: Meta<typeof PageHeader> = {
  title: "Components/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    title: {
      control: "text",
      description: "헤더 제목입니다.",
    },
    routeBackPath: {
      control: "text",
      description:
        "뒤로가기 링크의 이동 경로입니다. 값이 없으면 뒤로가기 아이콘을 표시하지 않습니다.",
    },
    variant: {
      control: "select",
      options: ["default", "centered"],
      description: "기본형 또는 와인 플로우용 가운데 정렬 헤더입니다.",
    },
    navigation: {
      control: "select",
      options: ["back", "home"],
      description: "이전 경로 이동 또는 홈 이동입니다.",
    },
    className: {
      control: "text",
      description: "헤더 wrapper에 추가할 className입니다.",
    },
  },
  args: {
    title: "와인 리스트 선택",
    routeBackPath: "/",
  },
  render: (args) => (
    <div className="w-[350px] bg-white">
      <PageHeader {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {};

export const Home: Story = {
  args: { navigation: "home", variant: "centered", routeBackPath: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: "홈으로 이동" });
    await expect(link).toHaveAttribute("href", "/");
    await expect(link.querySelector("svg.lucide-house")).toBeInTheDocument();
    await expect(
      canvas.queryByRole("link", { name: "뒤로가기" }),
    ).not.toBeInTheDocument();
  },
};

export const Centered: Story = {
  args: {
    variant: "centered",
  },
  render: (args) => (
    <div className="w-[350px] bg-canvas bg-violet-haze">
      <PageHeader {...args} />
    </div>
  ),
};

export const WithoutBackLink: Story = {
  args: {
    routeBackPath: undefined,
  },
};

export const LongTitle: Story = {
  args: {
    title: "와인 리스트 선택 화면의 아주 긴 제목",
  },
};
