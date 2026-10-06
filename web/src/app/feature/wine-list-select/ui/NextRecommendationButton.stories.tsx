import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, userEvent, within } from "storybook/test";
import { clearWineSelectionSnapshot } from "@/app/entity/wine-pairing-workflow/lib/workflow-snapshot-storage";
import NextRecommendationButton from "./NextRecommendationButton";

const meta: Meta<typeof NextRecommendationButton> = {
  title: "Feature/wine-list-select/NextRecommendationButton",
  component: NextRecommendationButton,
  tags: ["autodocs"],
  parameters: { layout: "centered", nextjs: { appDirectory: true } },
  args: {
    sessionId: "0198b013-f4a7-7a91-a232-20f4fe638b38",
    selectedWineIds: ["11111111-1111-4111-8111-111111111111"],
  },
  beforeEach: () => {
    getRouter().replace.mockClear();
    getRouter().push.mockClear();
    clearWineSelectionSnapshot();
    return () => clearWineSelectionSnapshot();
  },
};
export default meta;
type Story = StoryObj<typeof NextRecommendationButton>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "다음" }),
    );
    await expect(getRouter().replace).toHaveBeenCalledWith("/wine/keywords");
    await expect(getRouter().push).not.toHaveBeenCalled();
  },
};
export const Disabled: Story = {
  args: { selectedWineIds: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "다음" }),
    ).toBeDisabled();
    await expect(getRouter().replace).not.toHaveBeenCalled();
  },
};
