import { $ } from "bun";
import { PersistentTTLCache } from "./cache.ts";

const GIT_CACHE_TTL_MS = 5_000; // 5 seconds
const persistentCache = new PersistentTTLCache();

/**
 * Get the current git branch name
 * Uses caching to meet 100ms execution target
 * @param cwd - Optional working directory (defaults to process.cwd())
 * @returns Branch name or null if not in a git repo
 */
export async function getGitBranch(cwd?: string): Promise<string | null> {
  const workingDir = cwd || process.cwd();
  const cacheKey = `branch:${workingDir}`;

  const cached = await persistentCache.get<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const result = await $`git rev-parse --abbrev-ref HEAD`
    .nothrow()
    .quiet()
    .cwd(workingDir);

  if (result.exitCode !== 0) {
    await persistentCache.set(cacheKey, null, GIT_CACHE_TTL_MS);
    return null;
  }

  const branch = result.stdout.toString().trim();
  await persistentCache.set(cacheKey, branch, GIT_CACHE_TTL_MS);
  return branch;
}

/**
 * Get the GitHub URL for the origin remote
 * Converts SSH format to HTTPS for clickable links
 * @param cwd - Optional working directory (defaults to process.cwd())
 * @returns GitHub URL or null if not available
 */
export async function getGitHubUrl(cwd?: string): Promise<string | null> {
  const workingDir = cwd || process.cwd();
  const cacheKey = `github:${workingDir}`;

  const cached = await persistentCache.get<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const result = await $`git remote get-url origin`
    .nothrow()
    .quiet()
    .cwd(workingDir);

  if (result.exitCode !== 0) {
    await persistentCache.set(cacheKey, null, GIT_CACHE_TTL_MS);
    return null;
  }

  const remoteUrl = result.stdout.toString().trim();

  // Convert SSH format to HTTPS
  // git@github.com:user/repo.git -> https://github.com/user/repo
  const sshMatch = remoteUrl.match(/git@github\.com:(.+)\.git/);
  if (sshMatch) {
    const httpsUrl = `https://github.com/${sshMatch[1]}`;
    await persistentCache.set(cacheKey, httpsUrl, GIT_CACHE_TTL_MS);
    return httpsUrl;
  }

  // Already HTTPS
  if (remoteUrl.startsWith("https://github.com/")) {
    const cleanUrl = remoteUrl.replace(/\.git$/, "");
    await persistentCache.set(cacheKey, cleanUrl, GIT_CACHE_TTL_MS);
    return cleanUrl;
  }

  // Non-GitHub remote
  await persistentCache.set(cacheKey, null, GIT_CACHE_TTL_MS);
  return null;
}

/**
 * Extract project name from GitHub URL
 * @param url - GitHub URL (e.g., https://github.com/user/repo)
 * @returns Project name or null if URL is invalid
 */
export function getProjectName(url: string | null): string | null {
  if (!url) return null;

  const match = url.match(/github\.com\/[^/]+\/([^/]+)/);
  if (match) {
    return match[1];
  }

  return null;
}

const PR_CACHE_TTL_MS = 45_000; // 45 seconds

/**
 * Get PR info for the current branch via gh CLI
 * Uses persistent file cache to avoid ~600ms gh call on every render
 * Returns null when: gh not installed, not authenticated, no PR exists, or any error
 * Per D-05: uses gh pr view --json number,url
 * Per D-07: all failures are normal paths, not errors
 */
export async function getPullRequestInfo(
  cwd?: string,
): Promise<{ number: number; url: string } | null> {
  const workingDir = cwd || process.cwd();
  const cacheKey = `pr:${workingDir}`;

  // Check persistent file cache first (cross-invocation TTL)
  const cached = await persistentCache.get<{
    number: number;
    url: string;
  } | null>(cacheKey);
  if (cached !== undefined) return cached;

  const result = await $`gh pr view --json number,url`
    .nothrow()
    .quiet()
    .cwd(workingDir);

  if (result.exitCode !== 0) {
    await persistentCache.set(cacheKey, null, PR_CACHE_TTL_MS);
    return null;
  }

  try {
    const pr = JSON.parse(result.stdout.toString().trim()) as {
      number: number;
      url: string;
    };
    await persistentCache.set(cacheKey, pr, PR_CACHE_TTL_MS);
    return pr;
  } catch {
    await persistentCache.set(cacheKey, null, PR_CACHE_TTL_MS);
    return null;
  }
}
