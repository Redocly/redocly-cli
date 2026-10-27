import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runCommand } from '../helpers/helpers.js';
import {
  expectPasswordSent,
  startWriteOnlyServer,
  writeOnlyFixture,
} from '../helpers/write-only.js';
import { expectJavacPasses } from './javac.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let workDir = '';

describe('generate-client java generator, write-only properties', () => {
  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer-write-only'));
    await generateClient({
      api: writeOnlyFixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['java'],
    });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it(
    'sends the password and hydrates a response without it',
    async () => {
      expectJavacPasses(workDir, ['client/Client.java', 'Smoke.java']);

      const server = await startWriteOnlyServer();
      try {
        const result = await runCommand('java', ['-cp', 'out', 'Smoke', server.url], {
          cwd: workDir,
        });
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('JAVA_SMOKE_OK');
        expectPasswordSent(server);
        expect(server.handlerErrors).toEqual([]);
      } finally {
        await server.close();
      }
    },
    // javac starts a JVM, and a cold CI runner takes its time over that.
    180_000
  );
});
