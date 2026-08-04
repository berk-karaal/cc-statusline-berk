# Contributing to cc-statusline-berk

Thank you for your interest in contributing to cc-statusline-berk! This document outlines the development setup and release process.

## Development Setup

```bash
# Clone repository
git clone https://github.com/berk-karaal/cc-statusline-berk.git
cd cc-statusline-berk

# Install dependencies
just install

# Run tests
just test

# Build
just build
```

### Available Commands

| Command | Description |
|---------|-------------|
| `just install` | Install dependencies |
| `just dev` | Run in development mode |
| `just build` | Build the production bundle |
| `just test` | Run all tests |
| `just typecheck` | Run TypeScript type check |
| `just check` | Run linter (add `--write` to auto-fix) |
| `just format` | Format code |
| `just clean` | Clean build artifacts |

## After Making Changes

Before committing your changes, run the following to ensure code quality and standards:

```bash
# 1. Run type check
just typecheck

# 2. Run linter (auto-fix issues with just check --write)
just check

# 3. Format code
just format

# 4. Run tests
just test

# 5. Build to verify bundle works
just build
```

### Pre-commit Checklist

- [ ] TypeScript types are correct (`just typecheck`)
- [ ] Linting passes (`just check`)
- [ ] Code is formatted (`just format`)
- [ ] All tests pass (`just test`)
- [ ] Build succeeds (`just build`)
- [ ] No unrelated files are committed

## Release Process

This project uses a manual version bump and tagging workflow. GitHub Actions automatically publishes to npm when a new tag is pushed.

### Version Bumping

1. Update the version in `package.json` following [Semantic Versioning](https://semver.org/):
   - **Patch** (X.Y.Z → X.Y.Z+1): Bug fixes, documentation updates
   - **Minor** (X.Y.Z → X.Y+1.0): New features, backwards-compatible changes
   - **Major** (X.Y.Z → X+1.0.0): Breaking changes, incompatible API modifications

2. Commit the version change:
   ```bash
   git commit -m "chore: bump version to X.Y.Z"
   ```

3. Create a git tag with the version:
   ```bash
   git tag vX.Y.Z
   ```

4. Push the commit and tags:
   ```bash
   git push origin main --follow-tags
   ```

5. GitHub Actions will automatically publish to npm when the tag is pushed.

### Example Release

```bash
# Update package.json version to 0.2.0
git add package.json
git commit -m "chore: bump version to 0.2.0"
git tag v0.2.0
git push origin main --follow-tags
```

## Pull Request Guidelines

- Ensure type check passes: `just typecheck`
- Ensure linting passes: `just check` (or `just check --write` to auto-fix)
- Ensure code is formatted: `just format`
- Ensure tests pass: `just test`
- Ensure build succeeds: `just build`
- Follow existing code style and patterns
- Update documentation if adding new features
