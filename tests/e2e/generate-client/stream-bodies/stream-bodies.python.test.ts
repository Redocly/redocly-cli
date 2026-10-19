import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer } from '../helpers.js';
import type { MockServer } from '../mock-server.js';
import {
  replayableRows,
  runProgram,
  sized,
  startStreamServer,
  streamConsumer,
  streamFixture,
  streamRows,
  wireRows,
} from './stream-bodies.js';

describe('generate-client stream bodies, Python (end-to-end)', () => {
  let server: MockServer;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(streamConsumer);
    await generateClient({
      api: streamFixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['python'],
    });
    server = await startStreamServer();
  }, 60_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('a file-like object passes through once and bytes keep the retry policy', async () => {
    await runProgram(
      'python3',
      [join(workDir, 'smoke.py'), server.url],
      'PYTHON_SMOKE_OK',
      workDir
    );

    expect(wireRows(server.requests)).toEqual([...streamRows(sized), ...replayableRows]);
  }, 60_000);
});
