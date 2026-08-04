import type { PersistentTTLCache } from "./cache.ts";
import { getUsageScriptForModel, loadConfig } from "./config.ts";
import { getExternalUsage } from "./external-usage.ts";
import {
  getGitBranch,
  getGitHubUrl,
  getProjectName,
  getPullRequestInfo,
} from "./git.ts";
import { RESET, createHyperlink } from "./hyperlink.ts";
import type { ExternalUsageItem } from "./types.ts";
import type { ClaudeCodeInput } from "./types.ts";
import { getVisibleWidth } from "./width.ts";

// ANSI color constants
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

// Nerd Font icons
const ICON_MODEL = "\u{F01EC}";
const ICON_CONTEXT = "\u{F035B}";
const ICON_BRANCH = "\uE725";
const ICON_GITHUB = "\uF09B";
const ICON_RATE_LIMIT = "\u{F051B}"; // nf-md-timer
const ICON_PR = "\uEA64"; // nf-cod-git_pull_request
const ICON_FOLDER = "\u{F0256}"; // nf-md-folder
const ICON_CLOCK = "\u{F0954}"; // nf-md-clock_outline
const ICON_SESSION = "\u{F0322}"; // nf-md-fingerprint
const ICON_EFFORT = ""; // nf-fa-bolt

/**
 * Format model info to display name
 * Uses display_name from Claude Code, falls back to parsing model id
 */
export function formatModelName(
  model: ClaudeCodeInput["model"],
): string | null {
  if (!model) return null;

  // Prefer display_name from Claude Code
  if (model.display_name) return model.display_name;

  // Fall back to parsing model id
  const id = model.id;
  if (!id) return null;

  if (id.match(/claude-opus-4/)) return "Opus 4";
  if (id.match(/claude-sonnet-4/)) return "Sonnet 4";
  if (id.match(/claude-haiku/)) return "Haiku";

  return id;
}

/**
 * Get current directory name from Claude Code input
 * Falls back to process.cwd() if not available
 */
function getCurrentDirectoryName(input: ClaudeCodeInput): string | null {
  // Try workspace current_dir first
  const cwd = input.workspace?.current_dir || input.cwd;
  if (!cwd) return null;

  // Extract last path component
  const parts = cwd.split(/\//);
  return parts[parts.length - 1] || null;
}

/**
 * Format a token count to a human-readable string
 * e.g. 1000000 -> "1M", 200000 -> "200K"
 */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${Math.round(tokens / 1_000_000)}M`;
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`;
  }
  return String(tokens);
}

/**
 * Format countdown from a unix timestamp (seconds) to a human-readable string.
 * For "5h" windows: XhYm format (e.g. "2h34m")
 * For "7d" windows: XdYh format (e.g. "3d12h")
 * Returns "now" if the timestamp is in the past or exactly now.
 */
export function formatCountdown(
  resetsAtSec: number,
  windowLabel: "5h" | "7d",
): string {
  const secondsLeft = Math.max(0, resetsAtSec - Math.floor(Date.now() / 1000));
  if (secondsLeft <= 0) return "now";
  if (windowLabel === "5h") {
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    return `${h}h${m}m`;
  }
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  return `${d}d${h}h`;
}

/**
 * Format rate limit segments for Pro users.
 * Returns null if no rate limit data is available (non-Pro users).
 * Shows color-coded percentages with countdown timers.
 */
export function formatRateLimits(
  rateLimits: ClaudeCodeInput["rate_limits"],
): string | null {
  if (!rateLimits) return null;

  const segments: string[] = [];

  for (const [key, label] of [
    ["five_hour", "5h"],
    ["seven_day", "7d"],
  ] as const) {
    const window = rateLimits[key];
    if (!window) continue;

    if (
      window.used_percentage !== undefined &&
      window.resets_at !== undefined
    ) {
      const pct = Math.round(window.used_percentage);
      let color = GREEN;
      if (pct >= 90) color = RED;
      else if (pct >= 50) color = YELLOW;
      const countdown = formatCountdown(window.resets_at, label);
      segments.push(`${label}: ${color}${pct}% (${countdown})${RESET}`);
    } else {
      segments.push(`${label}: --`);
    }
  }

  if (segments.length === 0) return null;
  return `${ICON_RATE_LIMIT} ${segments.join(" | ")}`;
}

/**
 * Format external usage items similar to rate limits.
 * If 'time' is a Unix timestamp (number > 1e9), calculate countdown.
 * Otherwise display time as static text.
 * Color coding: <50% green, 50-89% yellow, >=90% red
 */
export function formatExternalUsage(items: ExternalUsageItem[]): string | null {
  if (items.length === 0) return null;

  const segments: string[] = [];

  for (const item of items) {
    // Parse percentage from value (e.g., "20%" -> 20)
    const pctMatch = item.value.match(/(\d+)/);
    const pct = pctMatch ? Number.parseInt(pctMatch[1], 10) : 0;

    let color = GREEN;
    if (pct >= 90) color = RED;
    else if (pct >= 50) color = YELLOW;

    // Format time - if it's a Unix timestamp (> 1e9), calculate countdown
    let timeStr: string;
    if (typeof item.time === "number" && item.time > 1_000_000_000) {
      const secondsLeft = Math.max(
        0,
        item.time - Math.floor(Date.now() / 1000),
      );
      if (secondsLeft <= 0) {
        timeStr = "now";
      } else if (secondsLeft < 86400) {
        // Less than a day - show hours and minutes
        const h = Math.floor(secondsLeft / 3600);
        const m = Math.floor((secondsLeft % 3600) / 60);
        timeStr = `${h}h${m}m`;
      } else {
        // More than a day - show days and hours
        const d = Math.floor(secondsLeft / 86400);
        const h = Math.floor((secondsLeft % 86400) / 3600);
        timeStr = `${d}d${h}h`;
      }
    } else {
      timeStr = String(item.time);
    }

    segments.push(`${item.title}: ${color}${item.value} (${timeStr})${RESET}`);
  }

  return `${ICON_RATE_LIMIT} ${segments.join(" | ")}`;
}

/**
 * Format PR info as clickable link or placeholder
 * Per D-08: Show as #123 with OSC 8 link
 * Per D-09: Use Nerd Font PR icon
 * Per D-11: Show "PR: --" when no PR
 */
export function formatPullRequest(
  pr: { number: number; url: string } | null,
): string {
  if (!pr) return `${ICON_PR} PR: --`;
  return `${ICON_PR} ${createHyperlink(`#${pr.number}`, pr.url)}`;
}

/**
 * Format the reasoning effort level.
 * Falls back to "missing" when Claude Code did not send an effort level
 * (older versions), so the block never silently disappears.
 */
export function formatEffort(input: ClaudeCodeInput): string {
  return `${ICON_EFFORT} ${input.effort?.level ?? "missing"}`;
}

/**
 * Format the effort level and session id as a standalone line.
 * Rendered on its own dedicated line (never inline, never dropped) so the id
 * can be copied straight into `claude --fork-session -r <session-id>`.
 * The full id is intentionally left untruncated to keep it copyable.
 * The session id is omitted when Claude Code did not provide one.
 */
export function formatSessionLine(input: ClaudeCodeInput): string {
  const parts = [formatEffort(input)];

  const sessionId = input.session_id;
  if (sessionId) {
    parts.push(`${ICON_SESSION} session: ${sessionId}`);
  }

  return parts.join(SEPARATOR);
}

/**
 * Build complete statusline from Claude Code input
 * Returns formatted single-line string with all available elements
 */
export async function formatStatusline(
  input: ClaudeCodeInput,
): Promise<string> {
  const parts: string[] = [];

  // Model name (DISP-01)
  const modelName = formatModelName(input.model);
  if (modelName) {
    parts.push(`${ICON_MODEL} ${modelName}`);
  }

  // Context usage (DISP-02)
  if (input.context_window?.used_percentage !== undefined) {
    const pct = Math.round(input.context_window.used_percentage);
    let color = GREEN;
    if (pct >= 90) color = RED;
    else if (pct >= 50) color = YELLOW;
    const size = input.context_window.context_window_size;
    const sizeLabel = size ? formatTokenCount(size) : null;
    parts.push(
      sizeLabel
        ? `${ICON_CONTEXT} ${color}${pct}% (${sizeLabel})${RESET}`
        : `${ICON_CONTEXT} ${color}${pct}%${RESET}`,
    );
  }

  // Rate limits (ADV-01)
  const rateLimitStr = formatRateLimits(input.rate_limits);
  if (rateLimitStr) {
    parts.push(rateLimitStr);
  }

  // Git operations — run in parallel for performance
  const [branch, githubUrl, prInfo] = await Promise.all([
    getGitBranch(),
    getGitHubUrl(),
    getPullRequestInfo(),
  ]);

  // Git branch (DISP-03)
  if (branch) {
    parts.push(`${ICON_BRANCH} ${branch}`);
  }

  // Project with GitHub link (DISP-04)
  const projectName = getProjectName(githubUrl);
  if (githubUrl && projectName) {
    parts.push(`${ICON_GITHUB} ${createHyperlink(projectName, githubUrl)}`);
  } else if (projectName) {
    parts.push(projectName);
  }

  // PR link (ADV-02) — only show when a PR exists
  if (prInfo) {
    parts.push(formatPullRequest(prInfo));
  }

  // Current time (24h with seconds)
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  parts.push(`${ICON_CLOCK} ${time}`);

  return parts.join(" | ");
}

// Multi-line formatting constants
const MAX_LINES = 3;
const SEPARATOR = " | ";

interface StatuslineItem {
  content: string;
  priority: number; // Lower = higher priority
}

/**
 * Build statusline items from Claude Code input.
 * Returns array of items with priority for multi-line formatting.
 */
export async function buildStatuslineItems(
  input: ClaudeCodeInput,
  cache: PersistentTTLCache,
): Promise<StatuslineItem[]> {
  const items: StatuslineItem[] = [];

  // Model (priority 1)
  const modelName = formatModelName(input.model);
  if (modelName) {
    items.push({ content: `${ICON_MODEL} ${modelName}`, priority: 1 });
  }

  // Context (priority 2)
  if (input.context_window?.used_percentage !== undefined) {
    const pct = Math.round(input.context_window.used_percentage);
    let color = GREEN;
    if (pct >= 90) color = RED;
    else if (pct >= 50) color = YELLOW;
    const size = input.context_window.context_window_size;
    const sizeLabel = size ? formatTokenCount(size) : null;
    items.push({
      content: sizeLabel
        ? `${ICON_CONTEXT} ${color}${pct}% (${sizeLabel})${RESET}`
        : `${ICON_CONTEXT} ${color}${pct}%${RESET}`,
      priority: 2,
    });
  }

  // Rate limits (priority 3)
  const rateLimitStr = formatRateLimits(input.rate_limits);
  if (rateLimitStr) {
    items.push({ content: rateLimitStr, priority: 3 });
  }

  // External usage (priority 3 - same as rate_limits, shown if rate_limits not present)
  // Load config and check for external usage script for current model
  const config = await loadConfig();
  const scriptConfig = modelName
    ? getUsageScriptForModel(config, modelName)
    : undefined;
  let externalUsageStr: string | null = null;
  if (scriptConfig && modelName) {
    const externalUsage = await getExternalUsage(
      modelName,
      scriptConfig,
      cache,
    );
    if (externalUsage) {
      externalUsageStr = formatExternalUsage(externalUsage);
      if (externalUsageStr) {
        items.push({ content: externalUsageStr, priority: 3 });
      }
    }
  }

  // Git operations - run in parallel
  const [branch, githubUrl, prInfo] = await Promise.all([
    getGitBranch(),
    getGitHubUrl(),
    getPullRequestInfo(),
  ]);

  // Branch (priority 4)
  if (branch) {
    items.push({ content: `${ICON_BRANCH} ${branch}`, priority: 4 });
  }

  // Project (priority 5) - GitHub repo or current directory
  const projectName = getProjectName(githubUrl);
  if (githubUrl && projectName) {
    items.push({
      content: `${ICON_GITHUB} ${createHyperlink(projectName, githubUrl)}`,
      priority: 5,
    });
  } else if (projectName) {
    items.push({ content: projectName, priority: 5 });
  } else {
    // Show current directory name when not in a GitHub repo
    const dirName = getCurrentDirectoryName(input);
    if (dirName) {
      items.push({ content: `${ICON_FOLDER} ${dirName}`, priority: 5 });
    }
  }

  // PR (priority 6)
  if (prInfo) {
    items.push({
      content: formatPullRequest(prInfo),
      priority: 6,
    });
  }

  // Time (priority 7)
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  items.push({ content: `${ICON_CLOCK} ${time}`, priority: 7 });

  // Sort by priority
  return items.sort((a, b) => a.priority - b.priority);
}

/**
 * Build multi-line statusline using greedy fill algorithm.
 * Items flow left-to-right, overflow to next line, max 3 lines.
 * Lower priority items are dropped if they don't fit.
 */
export function formatStatuslineMultiLine(
  items: StatuslineItem[],
  terminalWidth: number | null,
): string[] {
  // If no width detected, return single line with all items
  if (!terminalWidth) {
    return [items.map((i) => i.content).join(SEPARATOR)];
  }

  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentWidth = 0;

  const separatorWidth = getVisibleWidth(SEPARATOR);

  for (const item of items) {
    const itemWidth = getVisibleWidth(item.content);

    // First item on line doesn't need separator
    const neededWidth =
      currentLine.length === 0 ? itemWidth : separatorWidth + itemWidth;

    if (currentWidth + neededWidth <= terminalWidth) {
      // Fits on current line
      currentLine.push(item.content);
      currentWidth += neededWidth;
    } else if (lines.length < MAX_LINES - 1) {
      // Start new line if we haven't hit max
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [item.content];
      currentWidth = itemWidth;
    } else {
      // Last line is full or this item won't fit - drop remaining items
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      break;
    }
  }

  // Don't forget the last line
  if (currentLine.length > 0 && lines.length < MAX_LINES) {
    lines.push(currentLine);
  }

  // Join each line with separators
  return lines.map((line) => line.join(SEPARATOR));
}
