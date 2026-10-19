import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer } from '../helpers.js';
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

describe('generate-client stream bodies, Go (end-to-end)', () => {
  let server: MockServer;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(streamConsumer);
    await generateClient({
      api: streamFixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['go'],
    });
    server = await startStreamServer();
  }, 60_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it(
    'an io.Pipe passes through unbuffered once and []byte keeps the retry policy',
    async () => {
      await runProgram('go', ['run', '.', server.url], 'GO_SMOKE_OK', workDir);

      expect(wireRows(server.requests)).toEqual([...streamRows(chunked), ...replayableRows]);
    },
    // The first build on a cold cache compiles the stdlib and takes well over 60s.
    180_000
  );
});
