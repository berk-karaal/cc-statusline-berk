/**
 * Get terminal width by querying parent process TTY.
 * Uses ps + stty trick since statusline runs with piped stdout.
 * Returns null on Windows or if detection fails.
 */
export function getTerminalWidth(): number | null {
  // Skip on Windows - no TTY access
  if (process.platform === "win32") return null;

  try {
    // Get parent process TTY
    const tty = Bun.spawnSync(
      ["sh", "-c", "ps -o tty= -p $(ps -o ppid= -p $$)"],
      { stdout: "pipe" },
    )
      .stdout.toString()
      .trim();

    // Check for valid TTY
    if (!tty || tty === "??" || tty === "?") return null;

    // Get terminal size from TTY device
    const size = Bun.spawnSync(["sh", "-c", `stty size < /dev/${tty}`], {
      stdout: "pipe",
    })
      .stdout.toString()
      .trim();

    const [, cols] = size.split(" ").map(Number);
    if (cols > 0) return cols;
  } catch {
    // Fall through to tput fallback
  }

  // Fallback: try tput
  try {
    const cols = Bun.spawnSync(["tput", "cols"], { stdout: "pipe" })
      .stdout.toString()
      .trim();

    const parsed = Number.parseInt(cols, 10);
    if (parsed > 0) return parsed;
  } catch {
    // Detection failed
  }

  return null;
}
