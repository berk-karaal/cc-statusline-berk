import type { Config, UsageScriptConfig } from "./types.ts";

const CONFIG_PATH = `${Bun.env.HOME}/.config/cc-statusline-berk/config.json`;

/**
 * Load and validate user config from ~/.config/cc-statusline-berk/config.json
 * Returns null if file doesn't exist or is invalid JSON.
 * No validation errors are thrown - graceful degradation.
 */
export async function loadConfig(): Promise<Config | null> {
  try {
    const file = Bun.file(CONFIG_PATH);
    if (!(await file.exists())) {
      return null;
    }
    const content = await file.text();
    const config = JSON.parse(content) as Config;
    return config;
  } catch {
    // Return null on any error (file not found, invalid JSON, etc.)
    return null;
  }
}

/**
 * Get the usage script config for a specific model name.
 * Returns undefined if no matching script is configured.
 */
export function getUsageScriptForModel(
  config: Config | null,
  modelName: string,
): UsageScriptConfig | undefined {
  if (!config?.usage_scripts) {
    return undefined;
  }
  return config.usage_scripts[modelName];
}
