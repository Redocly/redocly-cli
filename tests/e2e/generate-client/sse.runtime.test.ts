// Behavioral e2e for SSE: a hand-written `node:http` server streams real
// `text/event-stream` frames, drops mid-stream, and the generated client
// auto-reconnects (resuming via `Last-Event-ID`). A second scenario aborts the
// stream mid-flight and asserts the loop completes WITHOUT throwing.
import { type ChildProcess } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  copyConsumer,
  expectTscPasses,
  generate,
  killServer,
  runTsx,
  startServer,
} from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/sse.yaml');

const SERVER_PORT = 3104;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client SSE consumer (reconnect + abort)', () => {
  let serverProcess: ChildProcess | undefined;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer('sse-consumer');
    const generatedFile = join(workDir, 'api.ts');
    generate(fixture, generatedFile);
    expect(existsSync(generatedFile)).toBe(true);

    expectTscPasses(['--noEmit', '-p', workDir]);

    serverProcess = await startServer('sse', { SSE_SERVER_PORT: String(SERVER_PORT) }, SERVER_BASE);
  }, 30_000);

  afterAll(async () => {
    if (serverProcess) {
      await killServer(serverProcess);
    }
    rmSync(workDir, { recursive: true, force: true });
  });

  test('a dropped stream reconnects with Last-Event-ID, flushes the final frame, and ends on a clean close', () => {
    const runResult = runTsx(join(workDir, 'index-finite.ts'), [SERVER_BASE], { cwd: workDir });
    expect(
      runResult.status,
      `finite consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);

    const parsed = JSON.parse(runResult.stdout.trim()) as {
      events: string[];
      ids: Array<string | undefined>;
      lastEventIds: Array<string | null>;
      finished: boolean;
    };

    // The loop ran to completion: a clean server close finished the stream rather than
    // reconnecting forever. `c` was delivered only via the final-frame flush (the third
    // frame had no trailing delimiter before the server closed).
    expect(parsed.finished).toBe(true);
    expect(parsed.events).toEqual(['a', 'b', 'c']);
    expect(parsed.ids).toEqual(['1', '2', '3']);
    expect(parsed.lastEventIds).toEqual([null, '2']);
  }, 90_000);

  test('reconnect: a transport failure opening the stream reconnects (not just mid-stream errors)', () => {
    const runResult = runTsx(join(workDir, 'index-connect-retry.ts'), [], { cwd: workDir });
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
  }, 30_000);

  test('abort: aborting the stream via AbortSignal completes the loop without throwing', () => {
    const runResult = runTsx(join(workDir, 'index-abort.ts'), [SERVER_BASE], { cwd: workDir });
    expect(
      runResult.status,
      `abort consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);

    const parsed = JSON.parse(runResult.stdout.trim()) as {
      aborted: boolean;
      received: number;
      error: string | null;
    };

    // The loop saw the first event, then the abort terminated it cleanly: no
    // AbortError escaped the `for await`.
    expect(parsed.aborted).toBe(true);
    expect(parsed.received).toBeGreaterThanOrEqual(1);
    expect(parsed.error).toBeNull();
  }, 30_000);
});
