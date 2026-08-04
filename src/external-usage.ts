import { $ } from "bun";
import type { PersistentTTLCache } from "./cache.ts";
import type { ExternalUsageItem, UsageScriptConfig } from "./types.ts";

/**
 * Execute external usage script and return parsed results.
 * Results are cached using PersistentTTLCache.
 * Returns null on any error (script not found, invalid JSON, etc.)
 */
export async function getExternalUsage(
  modelName: string,
  config: UsageScriptConfig,
  cache: PersistentTTLCache,
): Promise<ExternalUsageItem[] | null> {
  const cacheKey = `external_usage_${modelName}`;
  const ttlMs = config.cache * 1000;

  // Check cache first
  const cached = await cache.get<ExternalUsageItem[]>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    // Execute script via Bun.$ with nothrow and quiet
    const result = await $`${config.script}`.nothrow().quiet();

    if (result.exitCode !== 0) {
      return null;
    }

    // Parse JSON output
    const output = result.stdout.toString();
    const parsed = JSON.parse(output) as unknown;

    // Validate array structure
    if (!Array.isArray(parsed)) {
      return null;
    }

    // Validate each item has required fields
    const validated: ExternalUsageItem[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        typeof item.title === "string" &&
        "value" in item &&
        typeof item.value === "string" &&
        "time" in item &&
        (typeof item.time === "string" || typeof item.time === "number")
      ) {
        validated.push({
          title: item.title,
          value: item.value,
          time: item.time,
        });
      }
    }

    // Cache the result
    await cache.set(cacheKey, validated, ttlMs);

    return validated;
  } catch {
    // Return null on any error
    return null;
  }
}
