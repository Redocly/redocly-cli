import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STRICT_TSCONFIG, generate, repoRoot } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');

// Generation needs TypeScript 6 (the compiler API), but consumers compile the OUTPUT
// with whatever TypeScript they run — including 7, the native compiler, aliased as the
// `typescript7` devDependency. Its strict tsc must accept a generated client verbatim.
const tsc7 = join(repoRoot, 'node_modules/typescript7/lib/tsc.js');

describe('generated client under TypeScript 7 (consumer compiler)', () => {
  it('type-checks strict and clean with the native tsc', () => {
    const dir = mkdtempSync(join(repoRoot, '.ts7-consumer-test-'));
    try {
      generate(fixture, join(dir, 'client.ts'), ['--output-mode', 'split']);
      writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(STRICT_TSCONFIG), 'utf-8');
      const tsc = spawnSync('node', [tsc7, '--noEmit', '-p', dir], {
        encoding: 'utf-8',
        cwd: repoRoot,
      });
      expect(tsc.status, `tsc 7 failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
