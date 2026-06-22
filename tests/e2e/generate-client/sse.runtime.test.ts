// Behavioral e2e for SSE: a hand-written `node:http` server streams real
// `text/event-stream` frames, drops mid-stream, and the generated client
// auto-reconnects (resuming via `Last-Event-ID`). A second scenario aborts the
// stream mid-flight and asserts the loop completes WITHOUT throwing.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const indexEntryPoint = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/sse.yaml');
const consumerDir = join(__dirname, 'sse-consumer');
const generatedFile = join(consumerDir, 'api.ts');
const serverScript = join(consumerDir, 'server.ts');
const indexScript = join(consumerDir, 'index.ts');
const abortScript = join(consumerDir, 'index-abort.ts');

const SERVER_PORT = 3104;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

async function waitForServerReady(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${SERVER_BASE}/__test__/ready`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `SSE server did not become ready within ${timeoutMs}ms: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function killServer(server: ChildProcess): Promise<void> {
  return new Promise((resolveFn) => {
    if (!server.pid || server.exitCode !== null) {
      resolveFn();
      return;
    }
    const onExit = (): void => resolveFn();
    server.once('exit', onExit);
    server.kill('SIGTERM');
    setTimeout(() => {
      server.removeListener('exit', onExit);
      if (server.exitCode === null) {
        server.kill('SIGKILL');
      }
      resolveFn();
    }, 2_000);
  });
}

describe('generate-client SSE consumer (reconnect + abort)', () => {
  let serverProcess: ChildProcess | undefined;

  beforeAll(async () => {
    if (existsSync(generatedFile)) {
      rmSync(generatedFile, { force: true });
    }

    const generateResult = spawnSync(
      'node',
      [indexEntryPoint, 'generate-client', fixture, '--output', generatedFile],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(generateResult.status, `generate-client stderr:\n${generateResult.stderr}`).toBe(0);
    expect(existsSync(generatedFile)).toBe(true);

    serverProcess = spawn('npx', ['tsx', serverScript], {
      cwd: consumerDir,
      env: { ...process.env, SSE_SERVER_PORT: String(SERVER_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(`[sse-server stderr] ${chunk.toString()}`);
    });

    await waitForServerReady(15_000);
  }, 30_000);

  afterAll(async () => {
    if (serverProcess) {
      await killServer(serverProcess);
    }
    // The generated `api.ts` is intentionally left in place, matching the other
    // consumer harnesses — it's committed (regeneration is deterministic) so the
    // repo-wide `tsc --noEmit` typecheck finds it present on a fresh checkout.
  });

  test('reconnect: events stream across a dropped connection, resuming via Last-Event-ID', () => {
    const runResult = spawnSync('npx', ['tsx', indexScript, SERVER_BASE], {
      encoding: 'utf-8',
      cwd: consumerDir,
      timeout: 20_000,
    });
    expect(
      runResult.status,
      `consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);

    const parsed = JSON.parse(runResult.stdout.trim()) as {
      events: string[];
      ids: Array<string | undefined>;
      lastEventIds: Array<string | null>;
    };

    // Typed `data.text` parsed across a reconnect: a, b (first connection), c (resume).
    expect(parsed.events).toEqual(['a', 'b', 'c']);
    // Event ids surfaced on the typed event.
    expect(parsed.ids).toEqual(['1', '2', '3']);
    // The reconnect carried `Last-Event-ID: 2` (1st connection: none; 2nd: '2').
    expect(parsed.lastEventIds).toEqual([null, '2']);
  }, 30_000);

  test('abort: aborting the stream via AbortSignal completes the loop without throwing', () => {
    const runResult = spawnSync('npx', ['tsx', abortScript, SERVER_BASE], {
      encoding: 'utf-8',
      cwd: consumerDir,
      timeout: 20_000,
    });
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
