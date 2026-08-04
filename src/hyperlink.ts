/**
 * Create OSC 8 terminal hyperlink
 * Format: \e]8;;URL\\TEXT\e]8;;\\
 *
 * OSC 8 is supported in most modern terminals (iTerm2, Windows Terminal,
 * VS Code terminal, etc.). Unsupported terminals gracefully ignore sequences.
 *
 * @see https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
 */
export function createHyperlink(text: string, url: string): string {
  const OSC = "\x1b]";
  const ST = "\x1b\\";
  return `${OSC}8;;${url}${ST}${text}${OSC}8;;${ST}`;
}

/** ANSI reset code */
export const RESET = "\x1b[0m";
