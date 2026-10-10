import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import BetaWelcomeDialog, { type BetaWelcomeDialogProps } from "./BetaWelcomeDialog";

const meta = {
  title: "Feature/beta-access/BetaWelcomeDialog",
  component: BetaWelcomeDialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { isEntering: false, errorMessage: null, needsReauthentication: false, onStart: fn(), onReauthenticate: fn() },
} satisfies Meta<typeof BetaWelcomeDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
async function lastSlide(canvasElement: HTMLElement) {
  const screen = within(canvasElement.ownerDocument.body);
  await userEvent.click(await screen.findByRole("button", { name: "3번째 안내 보기" }));
  await screen.findByRole("button", { name: "첫 번째 마이쏨 시작하기" }).catch(() => screen.findByRole("button", { name: "베타 코드 다시 입력하기" }));
  return screen;
}
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await expect(await screen.findByRole("heading", { name: "MYSOMM FOUNDING 500" })).toBeVisible();
    await expect(screen.queryByRole("button", { name: "첫 번째 마이쏨 시작하기" })).toBeNull();
    await userEvent.keyboard("{Escape}");
    await expect(screen.getByRole("dialog")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "2번째 안내 보기" }));
    await expect(await screen.findByRole("heading", { name: "이번에 함께 확인할 것" })).toBeVisible();
    await expect(screen.getByText("1. 와인 리스트를 찍고")).toBeVisible();
    await expect(screen.getByText("2. 함께 먹을 음식을 고르고")).toBeVisible();
    await expect(screen.getByText("3. 지금 마실 와인을 쉽게 고를 수 있는지")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "1번째 안내 보기" }));
    await expect(await screen.findByRole("heading", { name: "MYSOMM FOUNDING 500" })).toBeVisible();
    await lastSlide(canvasElement);
    await expect(screen.getByText("❤️ 내가 좋아한 와인 기억하기")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "첫 번째 마이쏨 시작하기" }));
    await expect(args.onStart).toHaveBeenCalledTimes(1);
  },
};
function LoadingExample(props: BetaWelcomeDialogProps) {
  const [isEntering, setIsEntering] = useState(false);
  return <BetaWelcomeDialog {...props} isEntering={isEntering} onStart={() => setIsEntering(true)} />;
}
export const Entering: Story = {
  render: (args) => <LoadingExample {...args} />,
  play: async ({ canvasElement }) => {
    const screen = await lastSlide(canvasElement);
    await userEvent.click(screen.getByRole("button", { name: "첫 번째 마이쏨 시작하기" }));
    await expect(await screen.findByRole("button", { name: /인증 확인 중/ })).toBeDisabled();
    await expect(screen.getByRole("button", { name: "1번째 안내 보기" })).toBeDisabled();
  },
};
export const Retry: Story = {
  args: { errorMessage: "입장하지 못했어요. 잠시 후 다시 시도해 주세요." },
  play: async ({ canvasElement }) => {
    const screen = await lastSlide(canvasElement);
    await expect(screen.getByRole("alert")).toBeVisible();
    await expect(screen.getByRole("button", { name: "첫 번째 마이쏨 시작하기" })).toBeEnabled();
  },
};
function ReauthenticationExample(props: BetaWelcomeDialogProps) {
  const [expired, setExpired] = useState(false);
  return <BetaWelcomeDialog {...props} needsReauthentication={expired} errorMessage={expired ? "인증이 만료되었어요. 베타 코드를 다시 입력해 주세요." : null} onStart={() => setExpired(true)} />;
}
export const Reauthenticate: Story = {
  render: (args) => <ReauthenticationExample {...args} />,
  play: async ({ canvasElement, args }) => {
    const screen = await lastSlide(canvasElement);
    await userEvent.click(screen.getByRole("button", { name: "첫 번째 마이쏨 시작하기" }));
    await userEvent.click(await screen.findByRole("button", { name: "베타 코드 다시 입력하기" }));
    await expect(args.onReauthenticate).toHaveBeenCalledTimes(1);
  },
};
