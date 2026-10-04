import type { PairingFieldName } from "@/app/entity/wine-pairing/model/wine-pairing.type";
import type { ConversationAction } from "./conversation.types";

export const STREAM_PRESENTATION_INTERVAL_MS = 40;
export const STREAM_PRESENTATION_CHARACTERS_PER_TICK = 3;

type TextAction = Extract<
  ConversationAction,
  { type: "PAIRING_SLIDE_FIELD" | "CHAT_APPEND" }
>;
type Entry = {
  action: ConversationAction;
  characters?: string[];
  offset: number;
};

/** 요청별 표시 큐. 수신은 즉시 적재하고 React에는 타이머 주기마다 한 batch만 전달한다. */
export function createConversationPresentation(
  dispatch: (action: ConversationAction) => void,
  signal: AbortSignal
) {
  let entries: Entry[] = [];
  let head = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let resolveFinished: (() => void) | undefined;
  let receivedFields = emptyFields();

  function cancel() {
    closed = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    entries = [];
    head = 0;
    signal.removeEventListener("abort", cancel);
    resolveFinished?.();
    resolveFinished = undefined;
  }

  function schedule() {
    if (!closed && timer === undefined && head < entries.length) {
      timer = setTimeout(tick, STREAM_PRESENTATION_INTERVAL_MS);
    }
  }

  function push(action: ConversationAction) {
    const text = textOf(action);
    entries.push({
      action,
      characters: text === null ? undefined : Array.from(text),
      offset: 0,
    });
    schedule();
  }

  function tick() {
    timer = undefined;
    if (closed || signal.aborted) {
      cancel();
      return;
    }

    let budget = STREAM_PRESENTATION_CHARACTERS_PER_TICK;
    const actions: ConversationAction[] = [];
    while (head < entries.length) {
      const entry = entries[head];
      if (!entry.characters) {
        actions.push(entry.action);
        head += 1;
        continue;
      }
      if (entry.offset === entry.characters.length) {
        head += 1;
        continue;
      }
      if (budget === 0) break;

      const count = Math.min(budget, entry.characters.length - entry.offset);
      const chunk = entry.characters.slice(entry.offset, entry.offset + count).join("");
      const action = entry.action as TextAction;
      const next: TextAction = action.type === "CHAT_APPEND"
        ? { ...action, chunk }
        : { ...action, data: chunk };
      // 서버 frame 경계와 무관하게 같은 필드를 한 번의 상태 갱신으로 합친다.
      const previous = actions[actions.length - 1];
      if (previous?.type === "CHAT_APPEND" && next.type === "CHAT_APPEND") {
        previous.chunk += next.chunk;
      } else if (
        previous?.type === "PAIRING_SLIDE_FIELD" &&
        next.type === "PAIRING_SLIDE_FIELD" && previous.field === next.field
      ) {
        previous.data += next.data;
      } else {
        actions.push(next);
      }
      entry.offset += count;
      budget -= count;
    }

    if (actions.length > 0) dispatch({ type: "PRESENTATION_BATCH", actions });
    if (head === entries.length) {
      entries = [];
      head = 0;
      if (resolveFinished) cancel();
    } else if (head > 256) {
      entries = entries.slice(head);
      head = 0;
    }
    schedule();
  }

  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();

  return {
    enqueue(action: ConversationAction) {
      if (closed) return;
      if (action.type === "PAIRING_SLIDE_FIELD") {
        receivedFields[action.field] += action.data;
      } else if (action.type === "PAIRING_SLIDE_COMMIT") {
        // JSON-only 응답도 점진 표시하며 STREAM에서 이미 받은 prefix는 중복 표시하지 않는다.
        const finalFields = {
          rank: String(action.payload.rank),
          name: action.payload.wine.wineName,
          comment: action.payload.comment,
          reason: action.payload.reason,
        };
        for (const field of Object.keys(finalFields) as PairingFieldName[]) {
          const value = finalFields[field];
          if (value.startsWith(receivedFields[field])) {
            const suffix = value.slice(receivedFields[field].length);
            if (suffix) push({ type: "PAIRING_SLIDE_FIELD", field, data: suffix });
          }
        }
        receivedFields = emptyFields();
      }
      push(action);
    },
    finish(action: ConversationAction): Promise<void> {
      if (closed) return Promise.resolve();
      return new Promise((resolve) => {
        resolveFinished = resolve;
        push(action);
      });
    },
    cancel,
  };
}

function emptyFields(): Record<PairingFieldName, string> {
  return { rank: "", name: "", comment: "", reason: "" };
}

function textOf(action: ConversationAction): string | null {
  if (action.type === "PAIRING_SLIDE_FIELD") return action.data;
  if (action.type === "CHAT_APPEND") return action.chunk;
  return null;
}
