import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');

describe('generate-client --runtime module, go', () => {
  let dir = '';

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'module-runtime-go-'));
    generate(fixture, join(dir, 'client.ts'), ['--generator', 'go', '--runtime', 'module']);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it(
    'the client and runtime.go build as one package',
    () => {
      writeFileSync(join(dir, 'go.mod'), 'module smoke.test\n\ngo 1.21\n', 'utf-8');
      const result = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
      expect(result.status, result.stderr).toBe(0);
    },
    // A cold CI cache compiles the stdlib on the first build.
    180_000
  );
});
