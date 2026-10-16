import { type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer, generate, killServer, serverLog, startServer } from './helpers.js';
import { chunked, replayableRows, runProgram, streamFixture, streamRows } from './stream-bodies.js';

const SERVER_PORT = 3117;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client stream bodies, Go (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer('stream-consumer');
    generate(streamFixture, join(workDir, 'client/client.ts'), ['--generator', 'go']);
    serverProcess = await startServer(
      'stream',
      { STREAM_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE
    );
  }, 60_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
    rmSync(workDir, { recursive: true, force: true });
  });

  it(
    'an io.Pipe passes through unbuffered once and []byte keeps the retry policy',
    async () => {
      runProgram('go', ['run', '.', SERVER_BASE], 'GO_SMOKE_OK', workDir);

      expect(await serverLog(SERVER_BASE)).toEqual([...streamRows(chunked), ...replayableRows]);
    },
    // The first build on a cold cache compiles the stdlib and takes well over 60s.
    180_000
  );
});
