import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/cafe.yaml');

describe('generate-client --runtime module, python', () => {
  let dir = '';

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'module-runtime-python-'));
    await generateClient({
      api: fixture,
      output: join(dir, 'client.ts'),
      generators: ['python'],
      runtime: 'module',
    });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('the client imports every runtime module it names', () => {
    expect(readdirSync(dir)).toContain('_send.py');
    expect(readFileSync(join(dir, 'client.py'), 'utf-8')).toContain('from _send import *');
    // Importing the client runs the runtime imports, which `py_compile` would not resolve.
    const result = spawnSync('python3', ['-c', 'import client'], { cwd: dir, encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  });
});
