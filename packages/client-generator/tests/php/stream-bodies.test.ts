import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer } from '../helpers/helpers.js';
import type { MockServer } from '../helpers/mock-server.js';
import {
  BINARY_B64,
  octetStream,
  replayableRows,
  runProgram,
  sized,
  startStreamServer,
  streamConsumer,
  streamFixture,
  streamRows,
  wireRows,
} from '../shared/stream-bodies/stream-bodies.js';

describe('generate-client stream bodies, PHP (end-to-end)', () => {
  let server: MockServer;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(streamConsumer);
    await generateClient({
      api: streamFixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['php'],
    });
    server = await startStreamServer();
  }, 60_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('a stream resource passes through once, chunked without fstat, and a string keeps the retry policy', async () => {
    await runProgram('php', [join(workDir, 'smoke.php'), server.url], 'PHP_SMOKE_OK', workDir);

    expect(wireRows(server.requests)).toEqual([
      ...streamRows(sized),
      ...replayableRows,
      {
        method: 'PUT',
        url: '/uploads/nostat',
        contentTypes: octetStream,
        transferEncoding: 'chunked',
        body: BINARY_B64,
      },
    ]);
  }, 60_000);
});
