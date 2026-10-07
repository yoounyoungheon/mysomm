import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ExtractedWine } from "@/app/entity/wine/model/wine.type";
import ExtractedWineCard from "./ExtractedWineCard";

const baseWine: ExtractedWine = {
  id: "e501190d-ad82-460a-9d3d-b78999d49841",
  wineName: "클라우디 베이 소비뇽 블랑",
  vintage: 2023,
  alcohol: "12.5% ~ 13.0%",
  price: [{ amount: 55000, currency: "KRW", currencySign: "₩", koreanUnit: "원" }],
  country: "New Zealand",
  region: "Marlborough",
  tannin: 1,
  body: 2.5,
  sweetness: 1,
  acid: 4,
  wineBottleImageUrl: "/images/wines/wine-white.png",
  confidence: 0.95,
  isCatalogMatched: true,
};

const meta: Meta<typeof ExtractedWineCard> = {
  title: "Feature/wine-list-select/ExtractedWineCard",
  component: ExtractedWineCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    wine: { control: "object" },
    isSelected: { control: "boolean" },
    onToggle: { action: "toggle", control: false },
  },
  args: {
    wine: baseWine,
    isSelected: false,
    onToggle: fn(),
  },
  render: (args) => (
    <div className="w-[360px] max-w-full bg-background-03 p-4">
      <ExtractedWineCard {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof ExtractedWineCard>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const image = canvasElement.querySelector("img")!;
    await expect(image).toHaveAttribute("src", "/images/wines/wine-white.png");
    const rect = image.parentElement!.getBoundingClientRect();
    expect(rect.width / rect.height).toBeCloseTo(3 / 4, 2);
    await userEvent.click(within(canvasElement).getByRole("checkbox"));
    await expect(args.onToggle).toHaveBeenCalledWith(baseWine.id);
  },
};

export const Selected: Story = {
  args: { isSelected: true },
};

export const NotCatalogMatched: Story = {
  args: {
    wine: { ...baseWine, isCatalogMatched: false, wineBottleImageUrl: null },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector("img")).toHaveAttribute("src", "/images/wines/wine-bottle.png");
    await expect(canvas.getByText("이미지 준비중")).toBeVisible();
    await expect(canvas.getByText("이미지 준비중")).toHaveStyle({ whiteSpace: "pre-line" });
  },
};

export const NullMetadata: Story = {
  args: {
    wine: {
      ...baseWine,
      wineName: "메타데이터가 비어 있는 와인",
      vintage: null,
      alcohol: null,
      country: null,
      region: null,
      wineBottleImageUrl: null,
    },
  },
};

export const LongName: Story = {
  args: {
    wine: {
      ...baseWine,
      wineName:
        "샤또 라 로즈 드 비트락 루즈 그랑 크뤼 클라쎄 스페셜 에디션 리저브 2020",
    },
  },
};
