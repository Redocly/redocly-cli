import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer, expectTscPasses, tsxBin } from '../helpers.js';
import type { MockServer } from '../mock-server.js';
import {
  chunked,
  replayableRows,
  runProgram,
  startStreamServer,
  streamConsumer,
  streamFixture,
  streamRows,
  wireRows,
} from './stream-bodies.js';

describe('generate-client stream bodies, TypeScript (end-to-end)', () => {
  let server: MockServer;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(streamConsumer);
    await generateClient({ api: streamFixture, output: join(workDir, 'client/client.ts') });
    server = await startStreamServer();
  }, 60_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('a ReadableStream passes through once and a Blob keeps the retry policy', async () => {
    // The `ReadableStream` body types are proven against the fresh generation.
    expectTscPasses(['--noEmit', '-p', workDir]);

    await runProgram(
      tsxBin,
      [join(workDir, 'consumer.ts'), server.url],
      'TYPESCRIPT_SMOKE_OK',
      workDir
    );

    expect(wireRows(server.requests)).toEqual([...streamRows(chunked), ...replayableRows]);
  }, 60_000);
});
