import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import IntroDialog from "./IntroDialog";
import { INTRO_DURATION_MS, INTRO_STORAGE_KEY } from "@/lib/intro/intro-policy";

const complete = fn();
function fixture(isFirstVisit: boolean, failed = false, recent = false) {
  return () => {
    const originalFetch = globalThis.fetch;
    const previous = sessionStorage.getItem(INTRO_STORAGE_KEY);
    if (recent) sessionStorage.setItem(INTRO_STORAGE_KEY, String(Date.now()));
    else sessionStorage.removeItem(INTRO_STORAGE_KEY);
    complete.mockClear();
    globalThis.fetch = async (input, init) => {
      if (input === "/api/intro/status") return Response.json({ isFirstVisit });
      if (input === "/api/intro/complete") {
        complete();
        return new Response(null, { status: failed ? 503 : 204 });
      }
      return originalFetch(input, init);
    };
    return () => {
      globalThis.fetch = originalFetch;
      if (previous === null) sessionStorage.removeItem(INTRO_STORAGE_KEY);
      else sessionStorage.setItem(INTRO_STORAGE_KEY, previous);
    };
  };
}

const meta: Meta<typeof IntroDialog> = {
  title: "Feature/intro/IntroDialog",
  component: IntroDialog,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { shouldShowIntro: true },
  argTypes: { shouldShowIntro: { control: "boolean", description: "RootLayout에서 계산한 첫 방문 초기값" } },
  decorators: [(Story) => {
    const [client] = useState(() => new QueryClient());
    return <QueryClientProvider client={client}><div id="app-content" tabIndex={-1}>페이지 콘텐츠</div><Story /></QueryClientProvider>;
  }],
};
export default meta;
type Story = StoryObj<typeof IntroDialog>;

export const Default: Story = {
  beforeEach: fixture(true),
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    expect(getComputedStyle(dialog).backgroundColor).toBe("rgb(110, 58, 245)");
    expect(getComputedStyle(within(dialog).getByText("MYSOMM")).color).toBe("rgb(255, 255, 255)");
    expect(within(dialog).getByText("내 손 안의 소믈리에", { selector: "p:not(.sr-only)" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "건너뛰기" })).not.toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
    const start = performance.now();
    await waitFor(() => expect(dialog).not.toBeInTheDocument(), { timeout: INTRO_DURATION_MS + 2000 });
    expect(performance.now() - start).toBeGreaterThan(INTRO_DURATION_MS - 500);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(document.getElementById("app-content")).toHaveFocus();
  },
};

export const ReturningVisitor: Story = {
  // Even a stale server "true" prop must respect the latest false cookie status.
  beforeEach: fixture(false),
  play: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  },
};

export const SaveFailure: Story = {
  beforeEach: fixture(true, true),
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await waitFor(() => expect(dialog).not.toBeInTheDocument(), { timeout: INTRO_DURATION_MS + 2000 });
    expect(complete).toHaveBeenCalledTimes(1);
  },
};

export const EscapeClose: Story = {
  beforeEach: fixture(true),
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(complete).toHaveBeenCalledTimes(1);
  },
};

export const RecentlyClosedTab: Story = {
  beforeEach: fixture(true, false, true),
  play: ReturningVisitor.play,
};
