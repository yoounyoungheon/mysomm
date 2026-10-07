import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, userEvent, within } from "storybook/test";
import {
  clearWinePairingSnapshot,
  clearWineSelectionSnapshot,
  loadWinePairingSnapshot,
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
        options.status ?? 200,
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
    await expect(
      await canvas.findByRole("button", { name: "한우 등심 구이" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
    await expect(
      canvasElement.querySelector(".animate-pulse"),
    ).not.toBeInTheDocument();
    const fixed = canvas.getByRole("button", { name: "소·양고기" });
    const ai = canvas.getByRole("button", { name: "한우 등심 구이" });
    await expect(
      Boolean(
        fixed.compareDocumentPosition(ai) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    await expect(
      canvas.getByRole("button", { name: "조개·갑각류" }).querySelector("img"),
    ).toHaveAttribute("src", expect.stringContaining("shrimp.png"));
    await expect(
      canvas.getByRole("button", { name: "조개·갑각류" }).querySelector("img"),
    ).toHaveAttribute("width", "18");
    const rows = canvasElement.querySelectorAll("[data-fixed-food-rows] > ul");
    await expect(rows).toHaveLength(4);
    await expect([...rows].map((row) => row.children.length)).toEqual([
      3, 2, 3, 3,
    ]);
    await expect(
      canvas.getByRole("button", { name: "햄버거·피자" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "햄버거·면" }),
    ).not.toBeInTheDocument();
  },
};

export const Selected: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole("button", { name: "한우 등심 구이" }),
    );

    await expect(
      canvas.getByRole("button", { name: "선택한 음식 보기, 1개" }),
    ).toBeVisible();
    getRouter().replace.mockClear();
    getRouter().push.mockClear();
    await userEvent.click(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    );
    await expect(getRouter().replace).toHaveBeenCalledWith("/wine/chat");
    await expect(getRouter().push).not.toHaveBeenCalled();
  },
};

export const MultipleSelected: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole("button", { name: "한우 등심 구이" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "해산물 파전" }));

    await expect(
      canvas.getByRole("button", { name: "선택한 음식 보기, 2개" }),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: stubStoryEnv({ pending: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pending = await canvas.findByRole("status", {
      name: "추천 메뉴를 불러오고 있어요.",
    });
    await expect(pending).toHaveAttribute("aria-busy", "true");
    await expect(pending).toHaveAttribute(
      "data-skeleton-variant",
      "menu-chips",
    );
    await expect(pending.querySelectorAll(".animate-pulse")).toHaveLength(12);
    await expect(pending.querySelector("svg")).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole("button", { name: "소·양고기" }),
    ).toBeEnabled();
    await expect(
      canvas.getByRole("textbox", { name: "음식 이름" }),
    ).toBeEnabled();
  },
};

export const Error: Story = {
  beforeEach: stubStoryEnv({
    status: 502,
    body: { message: "추천 메뉴를 불러오지 못했습니다." },
  }),
};

export const CustomInput: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "한우 등심 구이" });
    const input = canvas.getByRole("textbox", { name: "음식 이름" });
    await expect(input).toHaveAttribute(
      "placeholder",
      "찾는 음식이 없으면 직접 입력해주세요!",
    );
    await expect(
      canvas.queryByText("찾는 음식이 없어요"),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "추가" }));
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.type(input, "   {Enter}");
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "선택한 음식 보기, 0개" }),
    ).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, "떡볶이{Enter}");
    await expect(
      canvas.getByRole("button", { name: "떡볶이" }).querySelector("img"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "떡볶이" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(input).toHaveValue("");
    await expect(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    ).toBeEnabled();
    getRouter().replace.mockClear();
    await userEvent.click(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    );
    await expect(loadWinePairingSnapshot()?.menuNames).toEqual(["떡볶이"]);
    await expect(getRouter().replace).toHaveBeenCalledWith("/wine/chat");
    await userEvent.type(input, "떡볶이{Enter}");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "이미 목록에 있는 음식이에요.",
    );
    await userEvent.click(canvas.getByRole("button", { name: "떡볶이 삭제" }));
    await expect(
      canvas.queryByRole("button", { name: "떡볶이" }),
    ).not.toBeInTheDocument();
    await expect(input).toHaveFocus();
    await expect(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    ).toBeDisabled();
  },
};

export const MixedSelection: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "한우 등심 구이" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "생선" }));
    await expect(
      canvas.getByRole("button", { name: "선택한 음식 보기, 2개" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    ).toBeEnabled();
    await expect(
      canvas.queryByText(/카테고리·직접 입력 추천은 준비 중/),
    ).not.toBeInTheDocument();
    await userEvent.type(
      canvas.getByRole("textbox", { name: "음식 이름" }),
      "떡볶이{Enter}",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    );
    await expect(loadWinePairingSnapshot()?.menuNames).toEqual([
      "한우 등심 구이",
      "생선",
      "떡볶이",
    ]);
    await userEvent.click(canvas.getByRole("button", { name: "생선" }));
    await expect(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    ).toBeEnabled();
  },
};

export const Empty: Story = {
  beforeEach: stubStoryEnv({ body: { recommendedMenus: [] } }),
};

export const FixedFoodOnly: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "한우 등심 구이" });
    await userEvent.click(canvas.getByRole("button", { name: "소·양고기" }));
    await expect(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    ).toBeEnabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    );
    await expect(loadWinePairingSnapshot()?.menuNames).toEqual(["소·양고기"]);
  },
};

export const CartReview: Story = {
  beforeEach: stubStoryEnv({}),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "한우 등심 구이" }),
    );
    await expect(canvas.queryByText("1개 선택")).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "선택한 음식 보기, 1개" }),
    );
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(
      await body.findByRole("dialog", { name: "선택한 음식" }),
    );
    await userEvent.click(
      dialog.getByRole("button", { name: "한우 등심 구이 선택 해제" }),
    );
    await expect(dialog.getByText("선택한 음식이 없어요.")).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "닫기" }));
    await expect(
      canvas.getByRole("button", { name: "선택한 음식 보기, 0개" }),
    ).toHaveFocus();
    await expect(
      canvas.getByRole("button", { name: "와인 추천받기" }),
    ).toBeDisabled();
  },
};
