import { $ } from "bun";

const DEFAULT_CACHE_DIR = "/tmp/cc-statusline-berk-cache";

interface PersistentCacheEntry<T> {
  value: T;
  timestamp: number;
  ttlMs: number;
}

/**
 * Persistent file-backed cache with TTL expiration.
 * Stores JSON files so cache survives across process invocations.
 */
export class PersistentTTLCache {
  private dirCreated = false;

  constructor(private cacheDir: string = DEFAULT_CACHE_DIR) {}

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  private async ensureDir(): Promise<void> {
    if (this.dirCreated) return;
    try {
      await $`mkdir -p ${this.cacheDir}`.nothrow().quiet();
      this.dirCreated = true;
    } catch {
      // Directory creation failure is non-fatal
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const path = `${this.cacheDir}/${this.sanitizeKey(key)}.json`;
    try {
      const file = Bun.file(path);
      if (!(await file.exists())) return undefined;
      const entry = (await file.json()) as PersistentCacheEntry<T>;
      if (Date.now() - entry.timestamp > entry.ttlMs) return undefined;
      return entry.value;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.ensureDir();
    const path = `${this.cacheDir}/${this.sanitizeKey(key)}.json`;
    try {
      const entry: PersistentCacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttlMs,
      };
      await Bun.write(path, JSON.stringify(entry));
    } catch {
      // Cache write failure is non-fatal
    }
  }
}
