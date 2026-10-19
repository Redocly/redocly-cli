// Shared by the stream-bodies bars, one test file per language. Each generated client
// uploads a stream and a replayable body to the echo server in server.ts, which
// records the raw bytes, every Content-Type value, and how the body was framed. The
// programs under consumer/ only make the calls, in the same order; the tests
// assert on the server's log.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const streamFixture = join(__dirname, 'stream-bodies.yaml');
export const streamConsumer = join(__dirname, 'consumer');
export const streamServer = join(__dirname, 'server.ts');

// The payloads every consumer sends: a multipart body with its own boundary for the
// untyped multipart operation, and all 256 byte values for the binary ones.
const MULTIPART = Buffer.from(
  '--redocly\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello stream\r\n--redocly--\r\n'
);
const BINARY = Buffer.from(Array.from({ length: 256 }, (_, index) => index));
export const BINARY_B64 = BINARY.toString('base64');
export const octetStream = ['application/octet-stream'];

type Framing = { contentLength?: string; transferEncoding?: string };
export const chunked = (): Framing => ({ transferEncoding: 'chunked' });
export const sized = (payload: Buffer): Framing => ({ contentLength: String(payload.length) });

/**
 * The three stream uploads every consumer makes first. `framing` is how that runtime puts
 * a stream on the wire: chunked when it never measures the body, with a length when its
 * HTTP library reads one off a seekable stream. Either way the bytes arrive untouched,
 * no Content-Type is invented for a multipart stream, the declared one fills the gap for
 * a binary one, and the failing route sees exactly one attempt.
 */
export function streamRows(framing: (payload: Buffer) => Framing) {
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
export const replayableRows = [
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
export function runProgram(command: string, args: string[], marker: string, cwd: string): void {
  const result = spawnSync(command, args, { encoding: 'utf-8', cwd, timeout: 120_000 });
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain(marker);
}
