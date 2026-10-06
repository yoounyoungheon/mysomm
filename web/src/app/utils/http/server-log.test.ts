import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  createServerRequestLog,
  loggedBackendFetch,
  withServerRequestLog,
} from "./server-log";

let records: Array<Record<string, unknown>>;
beforeEach(() => {
  records = [];
  for (const level of ["info", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((entry: string) =>
      records.push(JSON.parse(entry)),
    );
  }
});
afterEach(() => vi.restoreAllMocks());
const request = () =>
  new Request("http://localhost/api/test?secret=hidden", {
    method: "POST",
    headers: { cookie: "token=hidden" },
    body: "private message",
  });

describe("server request logs", () => {
  it("keeps JSON response unchanged and correlates stage logs without request content", async () => {
    const expected = Response.json({ ok: true });
    const handler = withServerRequestLog("test", async (_request, log) => {
      log.event("validation.passed", { wineCount: 2 });
      return expected;
    });
    expect(await handler(request())).toBe(expected);
    expect(records.map((r) => r.event)).toEqual([
      "request.started",
      "validation.passed",
      "request.completed",
    ]);
    expect(new Set(records.map((r) => r.requestId)).size).toBe(1);
    expect(JSON.stringify(records)).not.toMatch(
      /hidden|private message|cookie/,
    );
  });

  it("logs validation/auth rejection with safe HTTP status", async () => {
    const handler = withServerRequestLog(
      "test",
      async () => new Response(null, { status: 401 }),
    );
    await handler(request());
    expect(records.at(-1)).toMatchObject({
      event: "request.rejected",
      status: 401,
      level: "warn",
    });
  });

  it("does not log raw error messages and preserves thrown errors", async () => {
    const error = new Error("private credential");
    const handler = withServerRequestLog("test", async () => {
      throw error;
    });
    await expect(handler(request())).rejects.toBe(error);
    expect(records.at(-1)).toMatchObject({
      event: "request.failed",
      errorKind: "unexpected",
    });
    expect(JSON.stringify(records)).not.toContain("private credential");
  });

  it("drops non-numeric or boolean metadata even at runtime", () => {
    createServerRequestLog("test").event("validation.passed", {
      count: 2,
      enabled: true,
      payload: "secret",
      invalid: Infinity,
    } as unknown as Record<string, number | boolean>);
    expect(records[0]).toMatchObject({ count: 2, enabled: true });
    expect(records[0]).not.toHaveProperty("payload");
    expect(records[0]).not.toHaveProperty("invalid");
  });

  it("logs backend start, headers, timing and timeout without response data", async () => {
    const log = createServerRequestLog("test");
    const response = Response.json({ private: "secret" }, { status: 502 });
    expect(await loggedBackendFetch(log, async () => response)).toBe(response);
    expect(records.at(-1)).toMatchObject({
      event: "backend.response.received",
      status: 502,
      level: "error",
    });
    await expect(
      loggedBackendFetch(log, async () => {
        throw new DOMException("private URL", "TimeoutError");
      }),
    ).rejects.toThrow();
    expect(records.at(-1)).toMatchObject({
      event: "backend.request.failed",
      errorKind: "timeout",
    });
    expect(JSON.stringify(records)).not.toMatch(/secret|private URL/);
  });

  it("passes SSE bytes and headers unchanged and logs completion only after consumption", async () => {
    const chunks = [
      new TextEncoder().encode("data:private"),
      new TextEncoder().encode(" message\n\n"),
    ];
    let index = 0;
    const source = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (index < chunks.length) controller.enqueue(chunks[index++]);
          else controller.close();
        },
      },
      { highWaterMark: 0 },
    );
    const handler = withServerRequestLog(
      "test",
      async () =>
        new Response(source, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        }),
    );
    const response = await handler(request());
    expect(index).toBe(0);
    expect(records.some((r) => r.event === "stream.completed")).toBe(false);
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(await response.text()).toBe("data:private message\n\n");
    expect(records.at(-1)).toMatchObject({
      event: "stream.completed",
      chunks: 2,
      bytes: chunks.reduce((total, chunk) => total + chunk.length, 0),
    });
    expect(JSON.stringify(records)).not.toContain("private message");
  });

  it("propagates consumer cancellation to the backend stream", async () => {
    const cancel = vi.fn();
    const source = new ReadableStream<Uint8Array>({ cancel });
    const handler = withServerRequestLog(
      "test",
      async () =>
        new Response(source, {
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    const response = await handler(request());
    await response.body!.cancel("private reason");
    expect(cancel).toHaveBeenCalledWith("private reason");
    expect(records.at(-1)).toMatchObject({ event: "stream.cancelled" });
    expect(JSON.stringify(records)).not.toContain("private reason");
  });

  it("logs streaming failure and preserves the reader error", async () => {
    const error = new Error("private upstream body");
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(error);
      },
    });
    const handler = withServerRequestLog(
      "test",
      async () =>
        new Response(source, {
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    const response = await handler(request());
    await expect(response.text()).rejects.toBe(error);
    expect(records.at(-1)).toMatchObject({ event: "stream.failed" });
    expect(JSON.stringify(records)).not.toContain("private upstream body");
  });

  it("records request abort once and cancels upstream", async () => {
    const abort = new AbortController();
    const cancel = vi.fn();
    const handler = withServerRequestLog(
      "test",
      async () =>
        new Response(new ReadableStream({ cancel }), {
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    const response = await handler(
      new Request("http://localhost", { signal: abort.signal }),
    );
    abort.abort();
    expect(await response.text()).toBe("");
    expect(cancel).toHaveBeenCalledOnce();
    expect(records.filter((r) => r.event === "stream.aborted")).toHaveLength(1);
    expect(records.some((r) => r.event === "stream.completed")).toBe(false);
  });
});
