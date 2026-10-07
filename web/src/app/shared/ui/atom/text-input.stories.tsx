import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MagnifyingGlassIcon as SearchIcon } from "@radix-ui/react-icons";
import React from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import TextInput from "./text-input";

const meta: Meta<typeof TextInput> = {
  title: "Components/TextInput",
  component: TextInput,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["text", "password", "number"],
    },
    status: {
      control: { type: "select" },
      options: ["default", "error", "success"],
    },
    withIcon: { control: false },
    helperMessages: { control: "object" },
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
    onIconClick: { action: "iconClicked" },
    onValueChange: { action: "valueChanged" },
    label: { control: "text" },
  },
  args: {
    type: "text",
    placeholder: "입력하세요",
    disabled: false,
    status: "default",
  },
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof TextInput>;

export const Default: Story = {};

export const Types: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: 12, minWidth: 320 }}>
      <TextInput {...args} type="text" placeholder="text" />
      <TextInput {...args} type="password" placeholder="password" />
      <TextInput {...args} type="number" placeholder="number" />
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    withIcon: SearchIcon,
    placeholder: "Search",
  },
};

export const ErrorState: Story = {
  args: {
    status: "error",
    withIcon: SearchIcon,
    helperMessages: ["필수 입력 항목입니다."],
    placeholder: "오류 상태",
  },
};

export const SuccessState: Story = {
  args: {
    status: "success",
    withIcon: SearchIcon,
    placeholder: "성공 상태",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "비활성화",
  },
};

export const RoundedSurface: Story = {
  args: {
    "aria-label": "음식 이름",
    placeholder: "음식을 입력해 주세요",
    className:
      "min-h-11 border-white/70 bg-white/50 text-ink-card placeholder:text-ink-muted",
    onValueChange: fn(),
  },
  render: (args) => (
    <div className="w-[280px] bg-background-03 p-4">
      <TextInput {...args} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByRole("textbox", {
      name: "음식 이름",
    });
    await expect(input).toHaveClass("rounded-3xl", "bg-white/50");
    await expect(getComputedStyle(input.parentElement!).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
    await userEvent.type(input, "파스타");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("파스타");
  },
};
