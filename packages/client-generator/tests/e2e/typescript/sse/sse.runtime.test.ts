// Tests the SSE runtime against the mock server: the handlers stream real
// `text/event-stream` frames, drop mid-stream, and the generated client
// auto-reconnects (resuming via `Last-Event-ID`). A second scenario aborts the
// stream mid-flight and asserts the loop completes WITHOUT throwing.

import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, runTsx } from '../../helpers/helpers.js';
import { MockServer } from '../../helpers/mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/sse.yaml');

const SSE_HEADERS = {
  'content-type': 'text/event-stream',
  'cache-control': 'no-cache',
  connection: 'keep-alive',
};

describe('generate-client SSE consumer (reconnect + abort)', () => {
  let server: MockServer;
  let workDir = '';

  beforeAll(async () => {
    server = await MockServer.start(fixture, {
      handlers: {
        // The reconnect stream: two frames, a dropped connection, then the resume.
        streamMessages: ({ request, response }) => {
          response.writeHead(200, SSE_HEADERS);
          if (request.headers['last-event-id'] === '2') {
            // The resume: the final frame has NO trailing delimiter, then a clean close.
            // The client must flush this frame on stream end, and a clean close finishes
            // the stream instead of reconnecting.
            response.end('id: 3\ndata: {"text":"c","seq":3}');
            return undefined;
          }
          // The first connection: two frames, then the socket is destroyed with no chunked
          // terminator, as a real drop. The client reconnects with `Last-Event-ID: 2`.
          response.write('id: 1\nevent: msg\ndata: {"text":"a","seq":1}\n\n');
          response.write('id: 2\ndata: {"text":"b","seq":2}\n\n');
          setTimeout(() => response.destroy(), 100);
          return undefined;
        },
        // The abort stream: one frame, then the connection stays open until the client aborts.
        streamAbort: ({ response }) => {
          response.writeHead(200, SSE_HEADERS);
          response.write('id: 1\ndata: {"text":"a","seq":1}\n\n');
          // A periodic comment keeps the stream alive without new events.
          const keepAlive = setInterval(() => response.write(': keep-alive\n\n'), 200);
          response.on('close', () => clearInterval(keepAlive));
          return undefined;
        },
      },
    });

    workDir = copyConsumer(join(__dirname, 'consumer'));
    const generatedFile = join(workDir, 'api.ts');
    await generateClient({ api: fixture, output: generatedFile });
    expectTscPasses(['--noEmit', '-p', workDir]);
  });

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  test('a dropped stream reconnects with Last-Event-ID, flushes the final frame, and ends on a clean close', async () => {
    const runResult = await runTsx(join(workDir, 'index-finite.ts'), [server.url], {
      cwd: workDir,
    });
    expect(
      runResult.status,
      `finite consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);

    const parsed = JSON.parse(runResult.stdout.trim()) as {
      events: string[];
      ids: Array<string | undefined>;
      finished: boolean;
    };

    // The loop ran to completion: a clean server close finished the stream rather than
    // reconnecting forever. `c` was delivered only via the final-frame flush (the third
    // frame had no trailing delimiter before the server closed).
    expect(parsed.finished).toBe(true);
    expect(parsed.events).toEqual(['a', 'b', 'c']);
    expect(parsed.ids).toEqual(['1', '2', '3']);
    // The `Last-Event-ID` each connection sent: none first, then '2' on the resume.
    const lastEventIds = server.requests
      .filter((request) => request.operationId === 'streamMessages')
      .map((request) => request.headers['last-event-id']);
    expect(lastEventIds).toEqual([undefined, '2']);
    expect(server.handlerErrors).toEqual([]);
  });

  test('reconnect: a transport failure opening the stream reconnects (not just mid-stream errors)', async () => {
    const runResult = await runTsx(join(workDir, 'index-connect-retry.ts'), [], { cwd: workDir });
    expect(
      runResult.status,
      `connect-retry consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);

    const parsed = JSON.parse(runResult.stdout.trim()) as {
      calls: number;
      events: string[];
      finished: boolean;
    };

    // The first send attempt threw (simulated connection failure); the iterator reconnected
    // and the second attempt streamed the event, then finished.
    expect(parsed.calls).toBe(2);
    expect(parsed.events).toEqual(['a']);
    expect(parsed.finished).toBe(true);
  });

  test('abort: aborting the stream via AbortSignal completes the loop without throwing', async () => {
    const runResult = await runTsx(join(workDir, 'index-abort.ts'), [server.url], {
      cwd: workDir,
    });
    expect(
      runResult.status,
      `abort consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);

    const parsed = JSON.parse(runResult.stdout.trim()) as {
      received: number;
      error: string | null;
    };

    // The handler sends one event, then the abort terminates the loop cleanly: no
    // AbortError escaped the `for await`.
    expect(parsed.received).toBe(1);
    expect(parsed.error).toBeNull();
    expect(server.handlerErrors).toEqual([]);
  });
});
