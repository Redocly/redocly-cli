import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Type-check each example against its own (strict, browser-targeted) tsconfig. The
// root `npm run typecheck` is a single Node-targeted pass and excludes `examples/`
// (they are Vite/React apps needing DOM + JSX + bundler resolution), so they are
// verified here instead — same rigor, the right compiler options per project.
// Run `examples:regen` first: the gitignored clients must exist to type-check against.
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(pkgRoot, '..', '..');
const tsc = join(repoRoot, 'node_modules/.bin/tsc');
const examplesDir = join(repoRoot, 'tests/e2e/generate-client/examples');
const examples = readdirSync(examplesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
  .map((entry) => entry.name)
  .sort();

let failed = false;
for (const name of examples) {
  const res = spawnSync(tsc, ['--noEmit', '-p', join(examplesDir, name, 'tsconfig.json')], {
    stdio: 'inherit',
  });
  if (res.status !== 0) failed = true;
}
if (failed) process.exit(1);
