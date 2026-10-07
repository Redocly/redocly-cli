import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');

describe('generate-client --runtime module, php', () => {
  let dir = '';

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'module-runtime-php-'));
    generate(fixture, join(dir, 'client.ts'), ['--generator', 'php', '--runtime', 'module']);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('both files parse and the client requires its runtime', () => {
    for (const name of ['client.php', 'runtime.php']) {
      const lint = spawnSync('php', ['-l', join(dir, name)], { encoding: 'utf-8' });
      expect(lint.status, lint.stdout + lint.stderr).toBe(0);
    }
    const declare = spawnSync(
      'php',
      ['-r', `require '${join(dir, 'client.php')}'; echo 'DECLARED';`],
      { encoding: 'utf-8' }
    );
    expect(declare.status, declare.stdout + declare.stderr).toBe(0);
    expect(declare.stdout).toContain('DECLARED');
  });
});
