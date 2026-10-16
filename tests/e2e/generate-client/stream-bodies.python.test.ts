import { type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer, generate, killServer, serverLog, startServer } from './helpers.js';
import { replayableRows, runProgram, sized, streamFixture, streamRows } from './stream-bodies.js';

const SERVER_PORT = 3116;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client stream bodies, Python (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer('stream-consumer');
    generate(streamFixture, join(workDir, 'client/client.ts'), ['--generator', 'python']);
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

  it('a file-like object passes through once and bytes keep the retry policy', async () => {
    runProgram('python3', [join(workDir, 'smoke.py'), SERVER_BASE], 'PYTHON_SMOKE_OK', workDir);

    expect(await serverLog(SERVER_BASE)).toEqual([...streamRows(sized), ...replayableRows]);
  }, 60_000);
});
