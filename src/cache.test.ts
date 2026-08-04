import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PersistentTTLCache } from "./cache.ts";

describe("PersistentTTLCache", () => {
  let tempDir: string;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "cc-test-"));
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("set then get returns value, expired returns undefined", async () => {
    const cache = new PersistentTTLCache(tempDir);
    await cache.set("k", { n: 1 }, 60_000);
    expect(await cache.get("k")).toEqual({ n: 1 });
    await cache.set("exp", "v", 1);
    await Bun.sleep(5);
    expect(await cache.get("exp")).toBeUndefined();
  });

  test("handles missing keys and corrupt files gracefully", async () => {
    const cache = new PersistentTTLCache(tempDir);
    expect(await cache.get("nope")).toBeUndefined();
    await writeFile(join(tempDir, "bad.json"), "not json");
    expect(await cache.get("bad")).toBeUndefined();
  });
});
