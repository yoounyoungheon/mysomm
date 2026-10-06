import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  clearWinePairingSnapshot,
  clearWineSelectionSnapshot,
  saveWineSelectionSnapshot,
} from "@/app/entity/wine-pairing-workflow/lib/workflow-snapshot-storage";
import { WORKFLOW_SNAPSHOT_VERSION } from "@/app/entity/wine-pairing-workflow/model/workflow-snapshot.type";
import MenuCategoryRecommendationPage from "./MenuCategoryRecommendationPage";

const SESSION_ID = "0198b013-f4a7-7a91-a232-20f4fe638b38";

const recommendedMenus = [
  { name: "한우 등심 구이", category: "붉은 고기" },
  { name: "해산물 파전", category: "해산물" },
  { name: "바지락 오일 파스타", category: "파스타 및 면" },
] as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pendingResponse(signal?: AbortSignal): Promise<Response> {
  return new Promise((_, reject) => {
    const abort = () =>
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** Story마다 selection snapshot과 same-origin BFF 응답을 격리한다. */
function stubStoryEnv(options: {
  status?: number;
  body?: unknown;
  pending?: boolean;
}) {
  return async () => {
    const originalFetch = globalThis.fetch;

    clearWineSelectionSnapshot();
    clearWinePairingSnapshot();
    saveWineSelectionSnapshot({
      version: WORKFLOW_SNAPSHOT_VERSION,
      sessionId: SESSION_ID,
      pairingWineIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });

    globalThis.fetch = (async (_input, init) => {
      if (options.pending) return pendingResponse(init?.signal ?? undefined);

      return jsonResponse(
        options.body ?? { recommendedMenus },
        options.status ?? 200
      );
    }) as typeof fetch;

    return () => {
      globalThis.fetch = originalFetch;
      clearWineSelectionSnapshot();
      clearWinePairingSnapshot();
    };
  };
}

const withPageLayout: Decorator = function PageLayoutDecorator(Story) {
  return (
    <div className="flex h-[720px] w-[390px] flex-col overflow-hidden bg-background-03">
      <Story />
    </div>
  );
};

const meta: Meta<typeof MenuCategoryRecommendationPage> = {
  title:
    "Feature/menu-category-recommendation-result/MenuCategoryRecommendationPage",
  component: MenuCategoryRecommendationPage,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    nextjs: { appDirectory: true },
  },
  decorators: [withPageLayout],
};

export default meta;

type Story = StoryObj<typeof MenuCategoryRecommendationPage>;

export const Default: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "한우 등심 구이" })).toBeVisible();
    await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
    await expect(canvasElement.querySelector(".animate-pulse")).not.toBeInTheDocument();
  },
};

export const Selected: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole("button", { name: "한우 등심 구이" })
    );

    await expect(canvas.getByText("1개 선택")).toHaveClass("text-ink-card");
  },
};

export const MultipleSelected: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole("button", { name: "한우 등심 구이" })
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "해산물 파전" })
    );

    await expect(canvas.getByText("2개 선택")).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: stubStoryEnv({ pending: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pending = await canvas.findByRole("status", { name: "추천 메뉴를 불러오고 있어요." });
    await expect(pending).toHaveAttribute("aria-busy", "true");
    await expect(pending).toHaveAttribute("data-skeleton-variant", "menu");
    await expect(pending.querySelectorAll(".animate-pulse")).toHaveLength(12);
    await expect(pending.querySelector("svg")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "와인 추천받기" })).toBeDisabled();
  },
};

export const Error: Story = {
  beforeEach: stubStoryEnv({
    status: 502,
    body: { message: "추천 메뉴를 불러오지 못했습니다." },
  }),
};
