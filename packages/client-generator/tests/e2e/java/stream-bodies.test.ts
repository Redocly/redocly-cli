import { generateClient } from '@redocly/client-generator';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { copyConsumer } from '../helpers/helpers.js';
import type { MockServer } from '../helpers/mock-server.js';
import {
  chunked,
  replayableRows,
  runProgram,
  startStreamServer,
  streamConsumer,
  streamFixture,
  streamRows,
  wireRows,
} from '../shared/stream-bodies/stream-bodies.js';
import { expectJavacPasses } from './javac.js';

describe('generate-client stream bodies, Java', () => {
  let server: MockServer;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(streamConsumer);
    await generateClient({
      api: streamFixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['java'],
    });
    server = await startStreamServer();
  });

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it(
    'an InputStream passes through chunked once and a byte[] keeps the retry policy',
    async () => {
      expectJavacPasses(workDir, ['client/Client.java', 'Smoke.java']);
      await runProgram('java', ['-cp', 'out', 'Smoke', server.url], 'JAVA_SMOKE_OK', workDir);

      expect(wireRows(server.requests)).toEqual([...streamRows(chunked), ...replayableRows]);
      expect(server.handlerErrors).toEqual([]);
    },
    // javac starts a JVM, and a cold CI runner takes its time over that.
    180_000
  );

  it('hands an untyped body to the runtime helpers, which also encode a map', () => {
    // The smoke sends only streams and bytes, so the helper calls are checked in the source.
    const source = readFileSync(join(workDir, 'client/Client.java'), 'utf-8');
    expect(source).toContain('Body payload = multipartBody(body);');
    expect(source).toContain('Body payload = binaryBody(body, "application/octet-stream");');
  });
});
