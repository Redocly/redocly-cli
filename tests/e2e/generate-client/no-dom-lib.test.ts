import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STRICT_TSCONFIG, generate, repoRoot, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');

describe('generated client without the DOM lib', () => {
  it('type-checks strict and clean with only the ES and Node.js types', () => {
    const dir = mkdtempSync(join(repoRoot, '.no-dom-consumer-test-'));
    try {
      writeFileSync(join(dir, 'redocly.yaml'), 'client:\n  telemetry: on\n', 'utf-8');
      generate(fixture, join(dir, 'client.ts'), ['--config', join(dir, 'redocly.yaml')]);
      const tsconfig = {
        compilerOptions: { ...STRICT_TSCONFIG.compilerOptions, lib: ['ES2022'], types: ['node'] },
      };
      writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig), 'utf-8');
      const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
      expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
