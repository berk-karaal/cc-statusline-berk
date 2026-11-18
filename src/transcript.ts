import type { PersistentTTLCache } from "./cache.ts";

export interface SessionTokens {
  input: number;
  output: number;
}

interface ScanState extends SessionTokens {
  offset: number;
  lastRequestId: string | null;
}

const CHUNK_BYTES = 16 << 20;
const STATE_TTL_MS = 7 * 24 * 3600 * 1000;

/**
 * Sum token usage of every main-conversation API request in a transcript.
 * Transcripts can reach hundreds of MB, so only bytes appended since the last
 * run are parsed; the running totals and byte offset live in the file cache.
 */
export async function getSessionTokens(
  transcriptPath: string | undefined,
  cache: PersistentTTLCache,
): Promise<SessionTokens | null> {
  if (!transcriptPath) return null;
  try {
    const file = Bun.file(transcriptPath);
    const size = file.size;
    const key = `transcript_tokens_${transcriptPath}`;
    let state = await cache.get<ScanState>(key);
    if (!state || state.offset > size) {
      state = { offset: 0, input: 0, output: 0, lastRequestId: null };
    }
    if (state.offset === size) return state;

    const decoder = new TextDecoder();
    let pos = state.offset;
    let len = CHUNK_BYTES;
    while (pos < size) {
      const bytes = new Uint8Array(
        await file.slice(pos, pos + len).arrayBuffer(),
      );
      // Stop at the last newline: a trailing partial line is read on a later run
      const end = bytes.lastIndexOf(10);
      if (end === -1) {
        if (pos + len >= size) break;
        len *= 2;
        continue;
      }
      for (const line of decoder.decode(bytes.subarray(0, end)).split("\n")) {
        addLine(state, line);
      }
      pos += end + 1;
      len = CHUNK_BYTES;
    }
    state.offset = pos;

    await cache.set(key, state, STATE_TTL_MS);
    return state;
  } catch {
    return null;
  }
}

function addLine(state: ScanState, line: string): void {
  if (!line.includes('"requestId"')) return;
  let entry: {
    type?: string;
    requestId?: string;
    isSidechain?: boolean;
    message?: {
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
    };
  };
  try {
    entry = JSON.parse(line);
  } catch {
    return;
  }
  const usage = entry.message?.usage;
  if (entry.type !== "assistant" || !entry.requestId || !usage) return;
  if (entry.isSidechain) return;
  // One request is written as several consecutive lines (one per content block) with identical usage
  if (entry.requestId === state.lastRequestId) return;
  state.lastRequestId = entry.requestId;
  state.input +=
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  state.output += usage.output_tokens ?? 0;
}
