/**
 * Strip ANSI escape codes from text (colors, styles, cursor movements, etc.)
 * Based on the ANSI escape code pattern
 */
function stripAnsi(text: string): string {
  // ANSI escape codes pattern:
  // \x1b\[[0-9;]*m - SGR (Select Graphic Rendition) codes
  // \x1b\[[0-9;]*[A-Za-z] - CSI sequences
  // \x1b\][0-9;]*\x07 - OSC sequences (bell terminated)
  // \x1b\][0-9;]*\x1b\\ - OSC sequences (ST terminated)
  // \x1b[()[\]{}#%]*[A-Za-z] - other escape sequences
  return (
    text
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Required for ANSI SGR codes
      .replace(/\x1b\[[0-9;]*m/g, "")
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Required for ANSI CSI sequences
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Required for other ANSI escape sequences
      .replace(/\x1b[()[\]{}#%]*[A-Za-z]/g, "")
  );
}

/**
 * Calculate visible width of a string (excluding ANSI codes and OSC 8 hyperlinks).
 */
export function getVisibleWidth(text: string): number {
  // Strip ANSI escape codes (colors, styles)
  const withoutAnsi = stripAnsi(text);

  // Strip OSC 8 hyperlink sequences: \e]8;;URL\e\\TEXT\e]8;;\e\\
  // Pattern matches: \x1b]8;;...\x1b\\ ... \x1b]8;;\x1b\\
  const withoutHyperlinks = withoutAnsi.replace(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Required for OSC 8 hyperlink matching
    /\x1b]8;[^;]*;[^\x1b]*\x1b\\/g,
    "",
  );

  // Calculate width using Bun.stringWidth for Unicode/emoji support
  return Bun.stringWidth(withoutHyperlinks);
}
