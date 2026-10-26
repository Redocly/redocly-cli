import { generateClient } from '@redocly/client-generator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from '../helpers/helpers.js';
import {
  expectPasswordSent,
  startWriteOnlyServer,
  writeOnlyFixture,
} from '../helpers/write-only.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = join(__dirname, 'consumer/write_only.py');
let workDir = '';
let generatedFile = '';

describe('generate-client python generator, write-only properties', () => {
  beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'python-write-only-'));
    generatedFile = join(workDir, 'client.py');
    await generateClient({
      api: writeOnlyFixture,
      output: join(workDir, 'client.ts'),
      generators: ['python'],
    });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('sends the password and decodes a response without it', async () => {
    const server = await startWriteOnlyServer();
    try {
      const result = await runCommand('python3', [script, generatedFile, server.url]);
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain('PYTHON_SMOKE_OK');
      expectPasswordSent(server);
      expect(server.handlerErrors).toEqual([]);
    } finally {
      await server.close();
    }
  });
});
