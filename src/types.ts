/**
 * Input format from Claude Code via stdin
 * Based on Claude Code's statusline integration
 */
export interface ClaudeCodeInput {
  cwd?: string;
  session_id?: string;
  session_name?: string;
  transcript_path?: string;
  /** Reasoning effort level (low/medium/high) */
  effort?: {
    level?: string;
  };
  /** Model info — object with id and display_name */
  model?: {
    id?: string;
    display_name?: string;
  };
  workspace?: {
    current_dir?: string;
    project_dir?: string;
    added_dirs?: string[];
  };
  version?: string;
  output_style?: {
    name?: string;
  };
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  /** Context window usage information */
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    /** Total context window size in tokens */
    context_window_size?: number;
    /** Percentage of context window used (0-100) */
    used_percentage?: number;
    remaining_percentage?: number;
    current_usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    } | null;
  };
  exceeds_200k_tokens?: boolean;
  /** Rate limit information for Pro users */
  rate_limits?: {
    /** 5-hour rolling window */
    five_hour?: {
      /** Percentage of limit used (0-100) */
      used_percentage?: number;
      /** Unix timestamp in seconds when window resets */
      resets_at?: number;
    };
    /** 7-day rolling window */
    seven_day?: {
      /** Percentage of limit used (0-100) */
      used_percentage?: number;
      /** Unix timestamp in seconds when window resets */
      resets_at?: number;
    };
  };
  vim?: {
    mode?: string;
  };
  agent?: {
    name?: string;
  };
  worktree?: {
    name?: string;
    path?: string;
    branch?: string;
    original_cwd?: string;
    original_branch?: string;
  };
}

/** Configuration for external usage scripts */
export interface UsageScriptConfig {
  script: string;
  cache: number; // seconds
}

/** User configuration file structure */
export interface Config {
  usage_scripts?: Record<string, UsageScriptConfig>;
}

/** External usage item returned by scripts */
export interface ExternalUsageItem {
  title: string;
  value: string;
  time: string | number; // Can be static text or Unix timestamp
}

export default ClaudeCodeInput;
