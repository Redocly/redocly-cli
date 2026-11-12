// Write-only properties in the TypeScript client and its zod schemas: the request sends
// `password`, and the response types, the zod response schemas, and the runtime all
// accept a response without it, for one customer and for a list.
import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, runTsx } from '../../helpers/helpers.js';
import {
  expectPasswordSent,
  startWriteOnlyServer,
  writeOnlyFixture,
} from '../../helpers/write-only.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let dir = '';

describe('generate-client typescript + zod generators, write-only properties', () => {
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({
      api: writeOnlyFixture,
      output: join(dir, 'client.ts'),
      generators: ['typescript', 'zod'],
    });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('the response types leave the password out', () => {
    // The consumer's type-level assertions fail to compile when a response type has it.
    // Its tsconfig adds the node types for `process` to the shared strict flags.
    expectTscPasses(['--noEmit', '-p', dir]);
  });

  it('sends the password and decodes a response without it', async () => {
    const server = await startWriteOnlyServer();
    try {
      const result = await runTsx(join(dir, 'consumer.ts'), [server.url]);
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        customer: { id: 'c1', email: 'ada@example.com' },
        customers: [{ id: 'c1', email: 'ada@example.com' }],
        typedWithPassword: false,
        listedWithPassword: false,
      });
      expectPasswordSent(server);
      expect(server.handlerErrors).toEqual([]);
    } finally {
      await server.close();
    }
  });
});
