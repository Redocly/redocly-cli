import { generateClient } from '@redocly/client-generator';
import { type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  copyConsumer,
  expectTscPasses,
  killServer,
  serverLog,
  startServer,
  tsxBin,
} from '../helpers.js';
import {
  chunked,
  replayableRows,
  runProgram,
  streamConsumer,
  streamFixture,
  streamServer,
  streamRows,
} from './stream-bodies.js';

const SERVER_PORT = 3115;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client stream bodies, TypeScript (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(streamConsumer);
    await generateClient({ api: streamFixture, output: join(workDir, 'client/client.ts') });
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

  it('a ReadableStream passes through once and a Blob keeps the retry policy', async () => {
    // The `ReadableStream` body types are proven against the fresh generation.
    expectTscPasses(['--noEmit', '-p', workDir]);

    runProgram(tsxBin, [join(workDir, 'consumer.ts'), SERVER_BASE], 'TYPESCRIPT_SMOKE_OK', workDir);

    expect(await serverLog(SERVER_BASE)).toEqual([...streamRows(chunked), ...replayableRows]);
  }, 60_000);
});
