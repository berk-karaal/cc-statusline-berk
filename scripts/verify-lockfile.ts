#!/usr/bin/env bun
// Guards against a private/corporate npm registry leaking into bun.lock.
// Bun honours the npm_config_registry env var over both bunfig.toml and .npmrc,
// so a developer whose shell sets it will silently rewrite every resolved URL.

const ALLOWED_HOST = "registry.npmjs.org";

const lockfile = await Bun.file("bun.lock").text();
const hosts = [...lockfile.matchAll(/https?:\/\/([^/"]+)\//g)].map((m) => m[1]);
const offenders = [...new Set(hosts)].filter((h) => h !== ALLOWED_HOST);

if (offenders.length > 0) {
  console.error(
    `bun.lock resolves packages via non-public registry: ${offenders.join(", ")}`,
  );
  console.error("Regenerate it with: bun run install:public");
  process.exit(1);
}

console.log(`bun.lock resolves only via ${ALLOWED_HOST}`);
