# Custom Usage Metrics

cc-statusline-berk supports displaying usage metrics for external (non-Anthropic) model providers through custom scripts. This allows you to see API usage limits and quotas in your statusline alongside model information.

## Overview

When using API-based model providers that don't provide usage metrics through Claude Code, you can configure custom scripts to fetch and display this information. The scripts are executed asynchronously, with results cached to minimize performance impact.

## Configuration

Create a configuration file at:

```
~/.config/cc-statusline-berk/config.json
```

### Example Configuration

```json
{
  "usage_scripts": {
    "kimi-k2.5": {
      "script": "/Users/foo/scripts/kimi-usage.sh",
      "cache": 120
    },
    "gpt-4": {
      "script": "/Users/foo/scripts/openai-usage.sh",
      "cache": 60
    }
  }
}
```

### Configuration Fields

| Field           | Type   | Description                                         |
| --------------- | ------ | --------------------------------------------------- |
| `usage_scripts` | object | Map of model display names to script configurations |
| `script`        | string | Absolute path to the executable script              |
| `cache`         | number | Cache duration in seconds                           |

The model name key (e.g., `"kimi-k2.5"`) must match the `model.display_name` field provided by Claude Code.

## Script Requirements

Your script must:

1. Be executable
2. Output valid JSON to stdout
3. Return an array of usage items

### Output Format

```json
[
  {
    "title": "5h",
    "value": "20%",
    "time": "5h20m"
  },
  {
    "title": "7d",
    "value": "5%",
    "time": 1743952800
  }
]
```

### Item Fields

| Field   | Type             | Description                                             |
| ------- | ---------------- | ------------------------------------------------------- |
| `title` | string           | Label for the usage window (e.g., "5h", "24h", "month") |
| `value` | string           | Usage percentage or count (e.g., "20%", "150/1000")     |
| `time`  | string \| number | Either static text or a Unix timestamp                  |

### Time Display

The `time` field supports two formats:

- **Static text**: Displayed as-is (e.g., `"5h20m"`, `"2 days"`)
- **Unix timestamp**: If the value is a number greater than 1,000,000,000, it's treated as a Unix timestamp and displayed as a countdown (e.g., "2h34m", "3d12h")

## Example Scripts

### Simple Static Script

```bash
#!/bin/bash
# kimi-usage.sh - Returns static usage data

cat << 'EOF'
[
  { "title": "5h", "value": "20%", "time": "5h20m" },
  { "title": "7d", "value": "5%", "time": "5d20h" }
]
EOF
```

### Dynamic API Script

```bash
#!/bin/bash
# openai-usage.sh - Fetches real-time usage from API

# Fetch usage data from your provider's API
response=$(curl -s -H "Authorization: Bearer $API_KEY" \
  "https://api.example.com/v1/usage")

# Parse and format the response
# This example assumes the API returns usage in a specific format
cat << EOF
[
  {
    "title": "24h",
    "value": "$(echo "$response" | jq -r '.daily.percent')%",
    "time": $(echo "$response" | jq -r '.daily.resets_at')
  }
]
EOF
```

## Display Behavior

### Priority

External usage metrics are displayed at priority 3, the same as Claude's native rate limits. This means:

- If Claude rate limits are present, they take precedence
- If no Claude rate limits are available, external usage is shown
- Both cannot be displayed simultaneously at the same priority level

### Color Coding

Usage percentages are color-coded based on utilization:

- **Green** (`< 50%`): Healthy usage
- **Yellow** (`50-89%`): Elevated usage
- **Red** (`>= 90%`): Critical usage

### Format

External usage is formatted similarly to native rate limits:

```
󰔛 5h: 20% (5h20m) | 7d: 5% (5d20h)
```

## Error Handling

The implementation follows graceful degradation principles:

- **Missing config file**: No external usage shown (current behavior)
- **Script not found**: Silently skipped
- **Invalid JSON output**: Silently skipped
- **Script execution error**: Silently skipped
- **Cache failures**: Falls back to fresh script execution

No errors are displayed to the user; the statusline simply omits external usage if anything fails.

## Caching

Results are cached using the same `PersistentTTLCache` mechanism as git operations:

- Cache location: `/tmp/cc-statusline-berk-cache/`
- Cache key: `external_usage_${modelName}`
- TTL: Configured per-script via the `cache` field (in seconds)

The cache persists across Claude Code invocations since the tool runs as a new process each time.

## Testing Your Script

Test your script manually before configuring:

```bash
# Make executable
chmod +x /path/to/your-script.sh

# Test output
/path/to/your-script.sh

# Validate JSON
/path/to/your-script.sh | jq .
```

## Troubleshooting

### External usage not appearing

1. Verify the config file exists at `~/.config/cc-statusline-berk/config.json`
2. Check that the model name in config matches `model.display_name` from Claude Code
3. Ensure the script path is absolute and the script is executable
4. Test script output manually and validate it's valid JSON
5. Check that the JSON array contains valid items with all required fields

### Script executes but no output shown

- Verify the output is a JSON array (`[]`), not an object (`{}`)
- Ensure all items have the required fields: `title`, `value`, `time`
- Check that `title` and `value` are strings
- Check that `time` is either a string or number

### Performance concerns

- Increase the `cache` value to reduce script execution frequency
- Ensure your script exits quickly (avoid long API calls without caching)
- Consider implementing local caching within your script
