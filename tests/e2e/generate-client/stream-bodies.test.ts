// Behavioral e2e for stream request bodies: each generated client uploads a stream and
// a replayable body to a hand-written echo server, which records the raw bytes, every
// Content-Type value, and how the body was framed. The programs under stream-consumer/
// only make the calls, in the same order; the assertions here read the server's log.
import { spawnSync, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, killServer, repoRoot, serverLog, startServer, tsxBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/stream-bodies.yaml');
const consumerDir = join(__dirname, 'stream-consumer');
const generatedEntry = join(consumerDir, 'client/client.ts');

const SERVER_PORT = 3115;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;
const hasGo = spawnSync('go', ['version']).status === 0;
const hasPhp = spawnSync('php', ['--version']).status === 0;

// The payloads every consumer sends: a multipart body with its own boundary for the
// untyped multipart operation, and all 256 byte values for the binary ones.
const MULTIPART = Buffer.from(
  '--redocly\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello stream\r\n--redocly--\r\n'
);
const BINARY = Buffer.from(Array.from({ length: 256 }, (_, index) => index));
const BINARY_B64 = BINARY.toString('base64');
const octetStream = ['application/octet-stream'];

type Framing = { contentLength?: string; transferEncoding?: string };
const chunked = (): Framing => ({ transferEncoding: 'chunked' });
const sized = (payload: Buffer): Framing => ({ contentLength: String(payload.length) });

/**
 * The three stream uploads every consumer makes first. `framing` is how that runtime puts
 * a stream on the wire: chunked when it never measures the body, with a length when its
 * HTTP library reads one off a seekable stream. Either way the bytes arrive untouched,
 * no Content-Type is invented for a multipart stream, the declared one fills the gap for
 * a binary one, and the failing route sees exactly one attempt.
 */
function streamRows(framing: (payload: Buffer) => Framing) {
  return [
    {
      method: 'POST',
      url: '/uploads',
      contentTypes: [],
      body: MULTIPART.toString('base64'),
      ...framing(MULTIPART),
    },
    {
      method: 'PUT',
      url: '/uploads/declared',
      contentTypes: octetStream,
      body: BINARY_B64,
      ...framing(BINARY),
    },
    {
      method: 'POST',
      url: '/fail/stream',
      contentTypes: octetStream,
      body: BINARY_B64,
      ...framing(BINARY),
    },
  ];
}

// The replayable bodies that follow: the caller's lowercase `content-type` wins and is
// sent once, and the failing route sees all three attempts of the retry policy.
const failingBytes = {
  method: 'POST',
  url: '/fail/bytes',
  contentTypes: octetStream,
  contentLength: '256',
  body: BINARY_B64,
};
const replayableRows = [
  {
    method: 'PUT',
    url: '/uploads/custom',
    contentTypes: ['application/x-custom'],
    contentLength: '256',
    body: BINARY_B64,
  },
  failingBytes,
  failingBytes,
  failingBytes,
];

/** Run one consumer program; it must exit 0 and print its `<LANG>_SMOKE_OK` marker. */
function runProgram(command: string, args: string[], marker: string, cwd = repoRoot): void {
  const result = spawnSync(command, args, { encoding: 'utf-8', cwd });
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain(marker);
}

describe('generate-client stream bodies (end-to-end)', () => {
  let serverProcess: ChildProcess;

  // One server for the file, like the other suites: restarting it per test races the
  // next bind against the previous process's exit on the same port.
  beforeAll(async () => {
    serverProcess = await startServer(
      join(consumerDir, 'server.ts'),
      consumerDir,
      { STREAM_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'stream-server'
    );
  }, 30_000);

  beforeEach(async () => {
    await fetch(`${SERVER_BASE}/__test__/reset`, { method: 'POST' });
  });

  afterAll(async () => {
    await killServer(serverProcess);
    rmSync(join(consumerDir, 'client'), { recursive: true, force: true });
  });

  it('TypeScript: a ReadableStream passes through once and a Blob keeps the retry policy', async () => {
    generate(fixture, generatedEntry);
    // The consumer dir is excluded from the root typecheck, so the `ReadableStream`
    // body types are proven here against the fresh generation.
    const typecheck = spawnSync('npx', ['tsc', '--noEmit', '-p', consumerDir], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(typecheck.status, `${typecheck.stdout}\n${typecheck.stderr}`).toBe(0);

    runProgram(tsxBin, [join(consumerDir, 'consumer.ts'), SERVER_BASE], 'TYPESCRIPT_SMOKE_OK');

    expect(await serverLog(SERVER_BASE)).toEqual([...streamRows(chunked), ...replayableRows]);
  }, 60_000);

  it.skipIf(!hasHttpx)(
    'Python: a file-like object passes through once and bytes keep the retry policy',
    async () => {
      generate(fixture, generatedEntry, ['--generator', 'python']);

      runProgram('python3', [join(consumerDir, 'smoke.py'), SERVER_BASE], 'PYTHON_SMOKE_OK');

      expect(await serverLog(SERVER_BASE)).toEqual([...streamRows(sized), ...replayableRows]);
    },
    60_000
  );

  it.skipIf(!hasGo)(
    'Go: an io.Pipe passes through unbuffered once and []byte keeps the retry policy',
    async () => {
      generate(fixture, generatedEntry, ['--generator', 'go']);

      runProgram('go', ['run', '.', SERVER_BASE], 'GO_SMOKE_OK', consumerDir);

      expect(await serverLog(SERVER_BASE)).toEqual([...streamRows(chunked), ...replayableRows]);
    },
    // The first build on a cold cache compiles the stdlib and takes well over 60s.
    180_000
  );

  it.skipIf(!hasPhp)(
    'PHP: a stream resource passes through once, chunked without fstat, and a string keeps the retry policy',
    async () => {
      generate(fixture, generatedEntry, ['--generator', 'php']);

      runProgram('php', [join(consumerDir, 'smoke.php'), SERVER_BASE], 'PHP_SMOKE_OK');

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
    },
    60_000
  );
});
