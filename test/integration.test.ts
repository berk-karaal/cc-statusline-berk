import { describe, test, expect } from "bun:test";
import { $ } from "bun";

const ENTRY = "src/index.ts";
const BUNDLE = "dist/cc-statusline-berk.js";

/** Pipe JSON string into the CLI and return stripped stdout */
async function run(input: string, target = ENTRY) {
  const result = await $`echo ${input} | bun run ${target}`.nothrow().quiet();
  return {
    stdout: result.stdout.toString().trim(),
    stderr: result.stderr.toString().trim(),
    exitCode: result.exitCode,
  };
}

/** Strip ANSI escape sequences for easier assertions */
function stripAnsi(s: string) {
  return s.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, "");
}

describe("integration: src/index.ts", () => {
  test("full Claude Code input produces all segments", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const input = JSON.stringify({
      model: { id: "claude-opus-4-6", display_name: "Opus" },
      context_window: { used_percentage: 12, context_window_size: 1000000 },
      rate_limits: {
        five_hour: { used_percentage: 23, resets_at: nowSec + 9240 },
        seven_day: { used_percentage: 55, resets_at: nowSec + 302400 },
      },
    });

    const { stdout, exitCode } = await run(input);
    expect(exitCode).toBe(0);

    const plain = stripAnsi(stdout);
    expect(plain).toContain("Opus");
    expect(plain).toContain("12%");
    expect(plain).toContain("1M");
    expect(plain).toContain("5h:");
    expect(plain).toContain("23%");
    expect(plain).toContain("7d:");
    expect(plain).toContain("55%");
  });

  test("empty JSON input does not crash", async () => {
    const { stdout, exitCode } = await run("{}");
    expect(exitCode).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
  });

  test("model-only input shows model name", async () => {
    const { stdout, exitCode } = await run(JSON.stringify({
      model: { display_name: "Sonnet" },
    }));
    expect(exitCode).toBe(0);
    expect(stripAnsi(stdout)).toContain("Sonnet");
  });

  test("invalid JSON input exits cleanly", async () => {
    const { exitCode } = await run("not json at all");
    // Parser falls back to empty object, so it still works
    expect(exitCode).toBe(0);
  });

  test("effort and session id render on their own dedicated last line", async () => {
    const id = "3f9c1a2b-7d4e-4a1f-9c8b-2e6f0a1b2c3d";
    const { stdout, exitCode } = await run(
      JSON.stringify({
        model: { display_name: "Opus" },
        session_id: id,
        effort: { level: "medium" },
      }),
    );
    expect(exitCode).toBe(0);

    const lines = stripAnsi(stdout).split("\n");
    const last = lines[lines.length - 1];
    // Own line: effort first, full id present, no other segment shares the line
    expect(last).toContain(`session: ${id}`);
    expect(last.indexOf("medium")).toBeLessThan(last.indexOf("session: "));
    expect(last).not.toContain("Opus");
  });

  test("effort shows 'missing' when the payload has no effort", async () => {
    const { stdout, exitCode } = await run(
      JSON.stringify({
        model: { display_name: "Opus" },
        session_id: "abc-123",
      }),
    );
    expect(exitCode).toBe(0);

    const lines = stripAnsi(stdout).split("\n");
    const last = lines[lines.length - 1];
    expect(last).toContain("missing");
    expect(last).toContain("session: abc-123");
  });

  test("bottom line still renders effort when session_id is absent", async () => {
    const { stdout, exitCode } = await run(
      JSON.stringify({
        model: { display_name: "Opus" },
        effort: { level: "high" },
      }),
    );
    expect(exitCode).toBe(0);

    const lines = stripAnsi(stdout).split("\n");
    const last = lines[lines.length - 1];
    expect(last).toContain("high");
    expect(last).not.toContain("session:");
  });
});

describe("integration: dist bundle", () => {
  test("bundle produces same output as source", async () => {
    const input = JSON.stringify({
      model: { id: "claude-sonnet-4-6", display_name: "Sonnet" },
      context_window: { used_percentage: 45, context_window_size: 200000 },
    });

    const src = await run(input, ENTRY);
    const dist = await run(input, BUNDLE);

    expect(src.exitCode).toBe(0);
    expect(dist.exitCode).toBe(0);
    expect(stripAnsi(src.stdout)).toBe(stripAnsi(dist.stdout));
  });
});
