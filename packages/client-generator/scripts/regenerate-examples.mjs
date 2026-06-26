import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Regenerate each example's client in place. A `redocly.yaml` example uses the CLI
// (auto-discovering its `x-client-generator` block); the programmatic example runs
// its own `generate.ts`.
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(pkgRoot, '..', '..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const examples = [
  'fetch-functions',
  'service-class',
  'zod',
  'mock',
  'custom-generator',
  'tanstack-query',
  'programmatic',
];

for (const name of examples) {
  const cwd = join(pkgRoot, 'examples', name);
  const res = existsSync(join(cwd, 'redocly.yaml'))
    ? spawnSync('node', [cli, 'generate-client'], { cwd, stdio: 'inherit' })
    : spawnSync(tsx, [join(cwd, 'generate.ts')], { cwd, stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
}
