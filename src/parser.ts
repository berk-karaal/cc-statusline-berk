import type { ClaudeCodeInput } from "./types.ts";

/**
 * Read raw text from stdin
 * Uses Bun's native stdin API
 */
export async function readStdin(): Promise<string> {
  return await Bun.stdin.text();
}

/**
 * Parse JSON text into ClaudeCodeInput
 * Returns empty object on parse failure for graceful fallback
 */
export function parseInput(jsonText: string): ClaudeCodeInput {
  try {
    return JSON.parse(jsonText) as ClaudeCodeInput;
  } catch {
    return {}; // Graceful fallback for invalid JSON
  }
}

/**
 * Read from stdin and parse as ClaudeCodeInput
 * Combines readStdin and parseInput for convenience
 */
export async function getInput(): Promise<ClaudeCodeInput> {
  const text = await readStdin();
  return parseInput(text);
}
