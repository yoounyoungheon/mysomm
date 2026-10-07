import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import type { ExtractedWine } from "@/app/entity/wine/model/wine.type";
import ExtractedWineSection from "./ExtractedWineSection";

function makeWine(
  overrides: Partial<ExtractedWine> & { id: string },
): ExtractedWine {
  return {
    wineName: "클라우디 베이 소비뇽 블랑",
    vintage: 2023,
    alcohol: "12.5% ~ 13.0%",
    price: [
      { amount: 55000, currency: "KRW", currencySign: "₩", koreanUnit: "원" },
    ],
    country: "New Zealand",
    region: "Marlborough",
    tannin: 1,
    body: 2.5,
    sweetness: 1,
    acid: 4,
    wineBottleImageUrl: "/images/wines/wine-white.png",
    confidence: 0.95,
    isCatalogMatched: true,
    ...overrides,
  };
}

const wines: ExtractedWine[] = [
  makeWine({ id: "11111111-1111-4111-8111-111111111111" }),
  makeWine({
    id: "22222222-2222-4222-8222-222222222222",
    wineName: "몬테스 알파 카베르네 소비뇽",
    country: "Chile",
    region: "Colchagua Valley",
    isCatalogMatched: false,
    wineBottleImageUrl: "/images/wines/wine-red.png",
  }),
  makeWine({
    id: "33333333-3333-4333-8333-333333333333",
    wineName: "빌카르 살몽 브뤼 리저브",
    country: "France",
    region: "Champagne",
    wineBottleImageUrl: "/images/wines/wine-sparkling.png",
  }),
];

const meta: Meta<typeof ExtractedWineSection> = {
  title: "Feature/wine-list-select/ExtractedWineSection",
  component: ExtractedWineSection,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    wines: { control: "object" },
    selectedWineIds: { control: "object" },
    onToggleWine: { action: "toggle", control: false },
    title: { control: "text" },
  },
  args: {
    wines,
    selectedWineIds: ["22222222-2222-4222-8222-222222222222"],
  },
  render: function StatefulSection(args) {
    const [selectedWineIds, setSelectedWineIds] = useState(
      args.selectedWineIds,
    );
    return (
      <div className="w-[390px] max-w-full bg-background-03 p-4">
        <ExtractedWineSection
          {...args}
          selectedWineIds={selectedWineIds}
          onToggleWine={(id) =>
            setSelectedWineIds((ids) =>
              ids.includes(id)
                ? ids.filter((value) => value !== id)
                : [...ids, id],
            )
          }
        />
      </div>
    );
  },
};

export default meta;

type Story = StoryObj<typeof ExtractedWineSection>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "전체 선택" }));
    await expect(canvas.getByText("3개 선택")).toBeVisible();
    for (const checkbox of canvas.getAllByRole("checkbox"))
      await expect(checkbox).toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "전체 해제" }));
    for (const checkbox of canvas.getAllByRole("checkbox"))
      await expect(checkbox).not.toBeChecked();
    await expect(
      canvas.getByRole("button", { name: "전체 선택" }),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: { wines: [], selectedWineIds: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "전체 선택" }),
    ).toBeDisabled();
  },
};

export const NoneSelected: Story = {
  args: { selectedWineIds: [] },
};

export const AllSelected: Story = {
  args: { selectedWineIds: wines.map((wine) => wine.id) },
};
