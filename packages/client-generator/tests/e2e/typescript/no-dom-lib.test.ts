import { generateClient } from '@redocly/client-generator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expectTscPasses, repoRoot, writeStrictTsconfig } from '../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');

// A Node.js project often compiles without the DOM lib, so the generated client must
// type-check with only the ES lib and the Node.js types.
describe('generated client without the DOM lib', () => {
  it('type-checks strict and clean with only the ES and Node.js types', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'no-dom-consumer-'));
    try {
      await generateClient({ api: fixture, output: join(dir, 'client.ts'), telemetry: 'on' });
      writeStrictTsconfig(dir, ['**/*.ts'], {
        lib: ['ES2022'],
        types: ['node'],
        typeRoots: [join(repoRoot, 'node_modules/@types')],
      });
      expectTscPasses(['--noEmit', '-p', dir]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
