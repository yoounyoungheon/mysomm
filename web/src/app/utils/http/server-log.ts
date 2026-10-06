import "server-only";

type LogFields = Record<string, number | boolean>;
type Level = "info" | "warn" | "error";

function failureKind(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return "aborted";
  if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  if (error instanceof TypeError) return "network_or_type";
  return "unexpected";
}

export function createServerRequestLog(scope: string) {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  const write = (
    event: string,
    fields: LogFields = {},
    level: Level = "info",
    errorKind?: string,
  ) => {
    // Only numeric metrics and boolean flags may cross the logging boundary.
    const metrics = Object.fromEntries(
      Object.entries(fields).filter(
        ([, value]) =>
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value)),
      ),
    );
    const entry = JSON.stringify({
      ...metrics,
      timestamp: new Date().toISOString(),
      level,
      scope,
      requestId,
      event,
      elapsedMs: Math.round(performance.now() - started),
      ...(errorKind ? { errorKind } : {}),
    });
    console[level](entry);
  };
  return {
    event: write,
    error: (event: string, error: unknown, fields: LogFields = {}) =>
      write(
        event,
        fields,
        failureKind(error) === "aborted" ? "warn" : "error",
        failureKind(error),
      ),
  };
}

export type ServerRequestLog = ReturnType<typeof createServerRequestLog>;

/** Logs only response metadata; never reads the request or response body. */
export async function loggedBackendFetch(
  log: ServerRequestLog | undefined,
  fetchResponse: () => Promise<Response>,
) {
  const started = performance.now();
  log?.event("backend.request.started");
  try {
    const response = await fetchResponse();
    log?.event(
      "backend.response.received",
      {
        status: response.status,
        durationMs: Math.round(performance.now() - started),
      },
      response.ok ? "info" : response.status >= 500 ? "error" : "warn",
    );
    return response;
  } catch (error) {
    log?.error("backend.request.failed", error);
    throw error;
  }
}

function observeStream(
  body: ReadableStream<Uint8Array>,
  log: ServerRequestLog,
  signal: AbortSignal,
) {
  const reader = body.getReader();
  let chunks = 0;
  let bytes = 0;
  let finished = false;
  const finish = (event: string, error?: unknown) => {
    if (finished) return;
    finished = true;
    signal.removeEventListener("abort", onAbort);
    if (error !== undefined) log.error(event, error, { chunks, bytes });
    else
      log.event(
        event,
        { chunks, bytes },
        event === "stream.completed" ? "info" : "warn",
      );
  };
  const onAbort = () => {
    finish("stream.aborted");
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();
  log.event("stream.started");
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const result = await reader.read();
          if (result.done) {
            finish("stream.completed");
            reader.releaseLock();
            controller.close();
          } else {
            chunks += 1;
            bytes += result.value.byteLength;
            controller.enqueue(result.value);
          }
        } catch (error) {
          finish(signal.aborted ? "stream.aborted" : "stream.failed", error);
          reader.releaseLock();
          controller.error(error);
        }
      },
      async cancel(reason) {
        finish("stream.cancelled");
        try {
          await reader.cancel(reason);
        } finally {
          reader.releaseLock();
        }
      },
    },
    { highWaterMark: 0 },
  );
}

/** Public route wrapper: logs early returns and observes SSE without parsing or buffering. */
export function withServerRequestLog<T extends Request>(
  scope: string,
  handler: (request: T, log: ServerRequestLog) => Promise<Response>,
) {
  return async (request: T): Promise<Response> => {
    const log = createServerRequestLog(scope);
    log.event("request.started");
    try {
      const response = await handler(request, log);
      const isStream =
        response.headers.get("content-type")?.includes("text/event-stream") &&
        response.body;
      log.event(
        isStream
          ? "response.stream.ready"
          : response.ok
            ? "request.completed"
            : "request.rejected",
        {
          status: response.status,
        },
        response.ok ? "info" : response.status >= 500 ? "error" : "warn",
      );
      return isStream
        ? new Response(observeStream(response.body!, log, request.signal), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          })
        : response;
    } catch (error) {
      log.error("request.failed", error);
      throw error;
    }
  };
}
