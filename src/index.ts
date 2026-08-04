#!/usr/bin/env bun

import { PersistentTTLCache } from "./cache.ts";
import {
  buildStatuslineItems,
  formatSessionLine,
  formatStatuslineMultiLine,
} from "./formatter.ts";
import { getInput } from "./parser.ts";
import { getTerminalWidth } from "./terminal.ts";

async function main(): Promise<void> {
  try {
    const input = await getInput();
    const cache = new PersistentTTLCache();
    const items = await buildStatuslineItems(input, cache);
    const terminalWidth = getTerminalWidth();

    const lines = formatStatuslineMultiLine(items, terminalWidth);

    // Effort level and session id always get their own dedicated bottom line —
    // it bypasses the greedy/priority layout so it is never packed inline and
    // never dropped.
    lines.push(formatSessionLine(input));

    // Output each line
    for (const line of lines) {
      console.log(line);
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main();
