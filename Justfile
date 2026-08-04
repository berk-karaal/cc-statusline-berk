# Justfile for cc-statusline-berk
# https://github.com/casey/just

# List all available commands
[private]
default:
    @just --list

# Install dependencies (ignores any npm_config_registry override so bun.lock
# always resolves against the public npm registry)
install:
    bun run install:public

# Fail if bun.lock resolves packages via a non-public registry
verify-lockfile:
    bun run verify:lockfile

# Run in development mode (requires input JSON via stdin)
dev:
    bun run src/index.ts

# Build the production bundle
build:
    bun run build

# Run all tests
test:
    bun test

# Run type check
typecheck:
    bun run typecheck

# Run linter (add --write to auto-fix)
check:
    bun run lint

# Format code
format:
    bun run format

# Clean build artifacts
clean:
    rm -rf dist/
