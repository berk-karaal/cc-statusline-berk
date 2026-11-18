import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PersistentTTLCache } from "./cache.ts";
import { getSessionTokens } from "./transcript.ts";

const line = (requestId: string, out: number, extra = {}) =>
  `${JSON.stringify({
    type: "assistant",
    requestId,
    message: {
      content: [{ type: "text", text: "ğüş 🐱" }],
      usage: {
        input_tokens: 2,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 100,
        output_tokens: out,
      },
    },
    ...extra,
  })}\n`;

describe("getSessionTokens", () => {
  let dir: string;
  let path: string;
  let cache: PersistentTTLCache;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "cc-transcript-"));
    path = join(dir, "t.jsonl");
    cache = new PersistentTTLCache(join(dir, "cache"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("sums each request once, skipping duplicates, sidechains and other lines", async () => {
    await writeFile(
      path,
      `${JSON.stringify({ type: "user", message: { content: "hi" } })}\n${line("a", 5)}${line("a", 5)}${line("b", 7)}${line("s", 99, { isSidechain: true })}`,
    );
    expect(await getSessionTokens(path, cache)).toMatchObject({
      input: 224,
      output: 12,
    });
  });

  test("reads appended lines incrementally and waits for partial lines", async () => {
    const full = line("b", 7);
    await writeFile(path, line("a", 5) + full.slice(0, 20));
    expect(await getSessionTokens(path, cache)).toMatchObject({ output: 5 });
    await appendFile(path, full.slice(20));
    expect(await getSessionTokens(path, cache)).toMatchObject({
      input: 224,
      output: 12,
    });
  });

  test("restarts when the transcript shrinks", async () => {
    await writeFile(path, line("a", 5) + line("b", 7));
    await getSessionTokens(path, cache);
    await writeFile(path, line("c", 3));
    expect(await getSessionTokens(path, cache)).toMatchObject({ output: 3 });
  });

  test("null without a path, zeros before the transcript exists", async () => {
    expect(await getSessionTokens(undefined, cache)).toBeNull();
    expect(
      await getSessionTokens(join(dir, "missing.jsonl"), cache),
    ).toMatchObject({ input: 0, output: 0 });
  });
});
