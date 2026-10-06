import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import {
  clearWinePairingConsumed,
  clearWinePairingSnapshot,
  saveWinePairingSnapshot,
} from "@/app/entity/wine-pairing-workflow/lib/workflow-snapshot-storage";
import { WORKFLOW_SNAPSHOT_VERSION } from "@/app/entity/wine-pairing-workflow/model/workflow-snapshot.type";
import type {
  PairingSlidePayload,
  PairingStreamWine,
} from "@/app/entity/wine-pairing/model/wine-pairing.type";
import WinePairingChatView from "./WinePairingChatView";

const SESSION_ID = "0198b013-f4a7-7a91-a232-20f4fe638b38";

const sampleWine = {
  id: "11111111-1111-4111-8111-111111111111",
  wineName: "샤또 라 로즈 드 비트락 루즈",
  vintage: 2020,
  alcohol: "13.0% ~ 13.5%",
  price: [
    {
      amount: 55000,
      currency: "KRW",
      currencySign: "₩",
      koreanUnit: "원",
    },
  ],
  country: "France",
  region: "Bordeaux",
  tannin: 4,
  body: null,
  sweetness: 1,
  acid: 3,
  wineBottleImageUrl: "/images/wines/wine-white.png",
} satisfies PairingStreamWine;

const samplePayloads: PairingSlidePayload[] = [
  {
    pairingId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    rank: 1,
    wine: sampleWine,
    comment: "부드러운 레드와인이 필요하다면 이 친구로",
    reason:
      "된장의 감칠맛이 와인의 과실향을 더 또렷하게 만들어줌. 부담 없이 마시기 좋음. 가성비 괜찮음.",
  },
  {
    pairingId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    rank: 2,
    wine: {
      ...sampleWine,
      id: "22222222-2222-4222-8222-222222222222",
      wineName: "몬테스 알파 카베르네 소비뇽",
      country: "Chile",
      region: "Colchagua Valley",
    },
    comment: "진한 풍미를 원한다면 추천",
    reason: "스테이크와 진한 소스 요리에 잘 어울리는 묵직한 바디감이 있어요.",
  },
];

function pairingFrames(payloads: PairingSlidePayload[]): unknown[] {
  return payloads.flatMap((payload) => [
    {
      type: "STREAM",
      data: { fieldName: "rank", hasNext: false, body: String(payload.rank) },
    },
    {
      type: "STREAM",
      data: { fieldName: "name", hasNext: false, body: payload.wine.wineName },
    },
    {
      type: "STREAM",
      data: { fieldName: "comment", hasNext: false, body: payload.comment },
    },
    {
      type: "STREAM",
      data: { fieldName: "reason", hasNext: false, body: payload.reason },
    },
    { type: "JSON", data: payload },
  ]);
}

function chatFrames(answer: string): unknown[] {
  return answer.split(" ").map((word) => ({
    type: "STREAM",
    data: { body: `${word} ` },
  }));
}

function sseResponse(
  frames: unknown[],
  { frameDelayMs = 120, close = true }: { frameDelayMs?: number; close?: boolean } = {}
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(`data:${JSON.stringify(frame)}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, frameDelayMs));
      }
      if (close) {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Story별로 sessionStorage 스냅샷과 스트림 BFF 응답을 스텁한다.
 * cleanup으로 fetch와 sessionStorage를 복원해 상태 누수를 막는다.
 */
function stubStoryEnv(options: {
  seedRequest?: boolean;
  onPairing?: () => Response;
  onChat?: () => Response;
}) {
  return async () => {
    const originalFetch = globalThis.fetch;

    clearWinePairingSnapshot();
    clearWinePairingConsumed();
    if (options.seedRequest) {
      saveWinePairingSnapshot({
        version: WORKFLOW_SNAPSHOT_VERSION,
        sessionId: SESSION_ID,
        wineIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
        menuNames: ["해산물 파전", "바지락 오일 파스타"],
      });
    }

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/wine-pairings/pairing") && options.onPairing) {
        return options.onPairing();
      }
      if (url.includes("/api/wine-pairings/chat") && options.onChat) {
        return options.onChat();
      }
      return jsonResponse({ message: "stubbed" }, 404);
    }) as typeof fetch;

    return () => {
      globalThis.fetch = originalFetch;
      clearWinePairingSnapshot();
      clearWinePairingConsumed();
    };
  };
}

const withViewLayout: Decorator = function ViewLayoutDecorator(Story) {
  return (
    <div className="flex h-[720px] w-[calc(100vw-32px)] max-w-[520px] flex-col overflow-hidden bg-background-03">
      <Story />
    </div>
  );
};

const meta: Meta<typeof WinePairingChatView> = {
  title: "Feature/wine-pairing-chat/WinePairingChatView",
  component: WinePairingChatView,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [withViewLayout],
};

export default meta;

type Story = StoryObj<typeof WinePairingChatView>;

export const Default: Story = {
  beforeEach: stubStoryEnv({
    seedRequest: true,
    onPairing: () =>
      sseResponse(pairingFrames(samplePayloads), { frameDelayMs: 0 }),
  }),
};

/** 서버가 JSON 결과를 한 번에 반환해도 텍스트 표시 완료까지 입력을 잠근다. */
export const BurstResponse: Story = {
  beforeEach: stubStoryEnv({
    seedRequest: true,
    onPairing: () => {
      const frames = samplePayloads.map((data) => ({ type: "JSON", data }));
      return new Response(
        frames.map((frame) => `data:${JSON.stringify(frame)}\n\n`).join(""),
        { headers: { "Content-Type": "text/event-stream" } }
      );
    },
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pendingInput = await canvas.findByPlaceholderText("와인 추천이 끝나면 질문할 수 있어요");
    await expect(pendingInput).toBeDisabled();
    const readyInput = await canvas.findByPlaceholderText(
      "채팅을 입력하세요", {}, { timeout: 10_000 }
    );
    await expect(readyInput).toBeEnabled();
    await expect(canvas.getAllByRole("button", { name: /상세 정보 보기/ })).toHaveLength(2);
  },
};

/** 페어링이 완료되고 채팅 입력이 가능한 상태. 질문을 입력하면 스텁 답변이 스트리밍된다. */
export const PairingDone: Story = {
  beforeEach: stubStoryEnv({
    seedRequest: true,
    onPairing: () => sseResponse(pairingFrames(samplePayloads), { frameDelayMs: 60 }),
    onChat: () =>
      sseResponse(
        chatFrames(
          "첫 번째 와인은 타닌이 부드럽고 산도가 적당해서 된장 소스의 감칠맛을 살려줘요."
        ),
        { frameDelayMs: 80 }
      ),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByText("선택한 메뉴와 잘 어울리는 순서예요.")
    ).toBeVisible();
    await expect(
      canvas.getByText("카드를 뒤집어 상세 정보를 확인해 보세요.")
    ).toBeVisible();
  },
};

/** 프레임이 천천히 도착해 슬라이드가 페인팅되는 중인 상태. */
export const PairingStreaming: Story = {
  beforeEach: stubStoryEnv({
    seedRequest: true,
    onPairing: () =>
      sseResponse(pairingFrames(samplePayloads), {
        frameDelayMs: 1200,
        close: false,
      }),
  }),
};

export const WaitingForFirstResult: Story = {
  beforeEach: stubStoryEnv({
    seedRequest: true,
    onPairing: () => sseResponse([], { close: false }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByRole("status", { name: "어울리는 와인을 찾고 있어요." });
    await expect(panel).toHaveAttribute("aria-busy", "true");
    await expect(panel).toHaveAttribute("data-skeleton-variant", "wine");
    await expect(panel.querySelector("[data-wine-image-skeleton]")).toBeInTheDocument();
    await expect(canvas.getByPlaceholderText("와인 추천이 끝나면 질문할 수 있어요")).toBeDisabled();
  },
};

export const PairingError: Story = {
  beforeEach: stubStoryEnv({
    seedRequest: true,
    onPairing: () =>
      jsonResponse({ message: "와인 추천을 불러오지 못했습니다." }, 502),
  }),
};

export const NoRequest: Story = {
  beforeEach: stubStoryEnv({ seedRequest: false }),
};
