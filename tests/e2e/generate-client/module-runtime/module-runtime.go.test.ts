import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, generate } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/cafe.yaml');

describe('generate-client --runtime module, go', () => {
  let dir = '';

  beforeAll(() => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    generate(fixture, join(dir, 'client.ts'), ['--generator', 'go', '--runtime', 'module']);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it(
    'the client and runtime.go build as one package',
    () => {
      const result = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
      expect(result.status, result.stderr).toBe(0);
    },
    // A cold CI cache compiles the stdlib on the first build.
    180_000
  );
});
