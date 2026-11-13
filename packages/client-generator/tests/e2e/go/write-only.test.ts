import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runCommand } from '../helpers/helpers.js';
import {
  expectPasswordSent,
  startWriteOnlyServer,
  writeOnlyFixture,
} from '../helpers/write-only.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let workDir = '';

describe('generate-client go generator, write-only properties', () => {
  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer-write-only'));
    await generateClient({
      api: writeOnlyFixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['go'],
    });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it(
    'sends the password and decodes a response without it',
    async () => {
      const build = spawnSync('go', ['build', '-o', 'smoke', '.'], {
        cwd: workDir,
        encoding: 'utf-8',
      });
      expect(build.status, build.stderr).toBe(0);

      const server = await startWriteOnlyServer();
      try {
        const result = await runCommand(join(workDir, 'smoke'), [server.url]);
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('GO_SMOKE_OK');
        expectPasswordSent(server);
        expect(server.handlerErrors).toEqual([]);
      } finally {
        await server.close();
      }
    },
    // The first build on a cold CI cache compiles the standard library, so this test
    // gets more time than the project default.
    180_000
  );
});
