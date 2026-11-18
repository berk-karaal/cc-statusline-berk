import { describe, expect, test } from "bun:test";
import {
  formatCountdown,
  formatEffort,
  formatModelName,
  formatPullRequest,
  formatRateLimits,
  formatSessionLine,
  formatStatuslineMultiLine,
  formatTokens,
} from "./formatter.ts";

describe("formatModelName", () => {
  test("returns display_name when present", () => {
    expect(formatModelName({ display_name: "Opus" })).toBe("Opus");
  });

  test("falls back to parsing id", () => {
    expect(formatModelName({ id: "claude-opus-4-20250514" })).toBe("Opus 4");
  });

  test("returns null for undefined or empty", () => {
    expect(formatModelName(undefined)).toBeNull();
    expect(formatModelName({})).toBeNull();
  });
});

describe("formatCountdown", () => {
  test("5h window formats as XhYm", () => {
    const resetsAt = Math.floor(Date.now() / 1000) + 2 * 3600 + 34 * 60;
    expect(formatCountdown(resetsAt, "5h")).toBe("2h34m");
  });

  test("7d window formats as XdYh", () => {
    const resetsAt = Math.floor(Date.now() / 1000) + 3 * 86400 + 12 * 3600;
    expect(formatCountdown(resetsAt, "7d")).toBe("3d12h");
  });

  test("past or current timestamp returns 'now'", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    expect(formatCountdown(nowSec - 3600, "5h")).toBe("now");
    expect(formatCountdown(nowSec, "5h")).toBe("now");
  });
});

describe("formatRateLimits", () => {
  test("returns null for missing data", () => {
    expect(formatRateLimits(undefined)).toBeNull();
    expect(formatRateLimits({})).toBeNull();
  });

  test("formats both windows with color coding", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const result = formatRateLimits({
      five_hour: { used_percentage: 8, resets_at: nowSec + 9240 },
      seven_day: { used_percentage: 91, resets_at: nowSec + 302400 },
    });
    expect(result).toContain("5h:");
    expect(result).toContain("7d:");
    expect(result).toContain("\x1b[32m"); // GREEN for 8%
    expect(result).toContain("\x1b[31m"); // RED for 91%
    expect(result).toContain(" | ");
  });

  test("shows placeholder for partial window data", () => {
    const result = formatRateLimits({ five_hour: { used_percentage: 8 } });
    expect(result).toContain("--");
  });
});

describe("formatPullRequest", () => {
  test("shows placeholder when no PR", () => {
    expect(formatPullRequest(null)).toContain("PR: --");
  });

  test("shows PR number when PR exists", () => {
    expect(
      formatPullRequest({
        number: 42,
        url: "https://github.com/user/repo/pull/42",
      }),
    ).toContain("#42");
  });
});

describe("formatEffort", () => {
  test("shows the effort level", () => {
    expect(formatEffort({ effort: { level: "high" } })).toContain("high");
  });

  test("shows 'missing' when effort is absent", () => {
    expect(formatEffort({})).toContain("missing");
    expect(formatEffort({ effort: {} })).toContain("missing");
  });
});

describe("formatSessionLine", () => {
  test("shows only effort when session_id is missing", () => {
    const line = formatSessionLine({ effort: { level: "low" } });
    expect(line).toContain("low");
    expect(line).not.toContain("session: ");
    expect(line).not.toContain(" | ");
  });

  test("shows effort before the full session id", () => {
    const id = "3f9c1a2b-7d4e-4a1f-9c8b-2e6f0a1b2c3d";
    const line = formatSessionLine({
      session_id: id,
      effort: { level: "medium" },
    });
    expect(line.indexOf("medium")).toBeLessThan(line.indexOf("session: "));
    expect(line).toContain(" | ");
    // Full id must be present untruncated so it stays copyable
    expect(line).toContain(id);
  });

  test("empty session_id is treated as missing", () => {
    expect(formatSessionLine({ session_id: "" })).not.toContain("session: ");
  });

  test("shows token counts after the session id", () => {
    const line = formatSessionLine(
      {
        session_id: "abc",
        context_window: { total_input_tokens: 1000, total_output_tokens: 5 },
      },
      { input: 3000, output: 20 },
    );
    expect(line.indexOf("session: ")).toBeLessThan(
      line.indexOf("↑3K ↓20 (last ↑1K ↓5)"),
    );
  });
});

describe("formatTokens", () => {
  // Real 3-request payload: total_* equal the last request, not a session sum
  const cw = {
    total_input_tokens: 56611,
    total_output_tokens: 90,
    current_usage: {
      input_tokens: 2,
      output_tokens: 90,
      cache_creation_input_tokens: 227,
      cache_read_input_tokens: 56382,
    },
  };

  test("session totals then last request", () => {
    expect(formatTokens(cw, { input: 169387, output: 262 })).toBe(
      "↑169K ↓262 (last ↑57K ↓90)",
    );
  });

  test("only one part when the other is missing", () => {
    expect(formatTokens(cw, null)).toBe("last ↑57K ↓90");
    expect(formatTokens(undefined, { input: 5, output: 1 })).toBe("↑5 ↓1");
  });

  test("B and M get one decimal, whole values drop it", () => {
    // Real totals from a 467 MB transcript
    expect(
      formatTokens(undefined, { input: 2_244_962_719, output: 2_203_531 }),
    ).toBe("↑2.2B ↓2.2M");
    expect(formatTokens(undefined, { input: 1_000_000, output: 0 })).toBe(
      "↑1M ↓0",
    );
  });

  test("returns null without any token data", () => {
    expect(formatTokens(undefined, null)).toBeNull();
    expect(formatTokens({ used_percentage: 5 }, null)).toBeNull();
  });
});

describe("formatStatuslineMultiLine", () => {
  const items = [
    { content: "Model", priority: 1 },
    { content: "Context", priority: 2 },
    { content: "Branch", priority: 3 },
    { content: "Project", priority: 4 },
    { content: "Time", priority: 5 },
  ];

  test("returns single line when terminalWidth is null", () => {
    const lines = formatStatuslineMultiLine(items, null);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("Model | Context | Branch | Project | Time");
  });

  test("fits all items on single line when width allows", () => {
    const lines = formatStatuslineMultiLine(items, 100);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("Model | Context | Branch | Project | Time");
  });

  test("overflows to second line when needed", () => {
    // Width only fits ~2 items
    const lines = formatStatuslineMultiLine(items, 15);
    expect(lines.length).toBeGreaterThan(1);
  });

  test("respects 3-line maximum", () => {
    // Very narrow terminal
    const lines = formatStatuslineMultiLine(items, 10);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  test("drops lower priority items when they do not fit", () => {
    // Extremely narrow - only 1-2 items fit per line, 3 lines max
    const lines = formatStatuslineMultiLine(items, 8);
    expect(lines.length).toBeLessThanOrEqual(3);
    // Should have dropped some items (only 3 fit in 3 lines at 8 cols each)
    const allContent = lines.join(" ");
    expect(allContent.length).toBeLessThan(
      "Model | Context | Branch | Project | Time".length,
    );
  });

  test("handles empty items array", () => {
    const lines = formatStatuslineMultiLine([], 80);
    expect(lines).toHaveLength(0);
  });

  test("handles single item", () => {
    const lines = formatStatuslineMultiLine(
      [{ content: "Only", priority: 1 }],
      80,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("Only");
  });
});
