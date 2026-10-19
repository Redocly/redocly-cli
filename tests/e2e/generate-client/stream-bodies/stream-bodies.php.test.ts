import { generateClient } from '@redocly/client-generator';
import { type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer, killServer, serverLog, startServer } from '../helpers.js';
import {
  BINARY_B64,
  octetStream,
  replayableRows,
  runProgram,
  sized,
  streamConsumer,
  streamFixture,
  streamServer,
  streamRows,
} from './stream-bodies.js';

const SERVER_PORT = 3118;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client stream bodies, PHP (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(streamConsumer);
    await generateClient({
      api: streamFixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['php'],
    });
    serverProcess = await startServer(
      streamServer,
      { STREAM_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE
    );
  }, 60_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
    rmSync(workDir, { recursive: true, force: true });
  });

  it('a stream resource passes through once, chunked without fstat, and a string keeps the retry policy', async () => {
    runProgram('php', [join(workDir, 'smoke.php'), SERVER_BASE], 'PHP_SMOKE_OK', workDir);

    expect(await serverLog(SERVER_BASE)).toEqual([
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
