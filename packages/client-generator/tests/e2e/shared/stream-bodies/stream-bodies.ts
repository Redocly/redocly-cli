// Shared by the stream-bodies bars, one test file per language. Each generated client
// uploads a stream and a replayable body to an echo server, which records the raw bytes,
// every Content-Type value, and how the body was framed. The programs under consumer/
// only make the calls, in the same order; the tests assert on what the server received.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from '../../helpers/helpers.js';
import { MockServer, type MockRequest } from '../../helpers/mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const streamFixture = join(__dirname, 'openapi.yaml');
export const streamConsumer = join(__dirname, 'consumer');

// The payloads every consumer sends: a multipart body with its own boundary for the
// untyped multipart operation, and all 256 byte values for the binary ones.
const MULTIPART = Buffer.from(
  '--redocly\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello stream\r\n--redocly--\r\n'
);
const BINARY = Buffer.from(Array.from({ length: 256 }, (_, index) => index));
export const BINARY_B64 = BINARY.toString('base64');
export const octetStream = ['application/octet-stream'];

/**
 * Start the echo server: every request gets a 204, or a 503 under `/fail/`, so the
 * clients' retry policies have something to retry.
 */
export function startStreamServer(): Promise<MockServer> {
  return MockServer.start(streamFixture, {
    fallback: ({ request }) => ({ status: request.path.startsWith('/fail/') ? 503 : 204 }),
  });
}

/** What each request put on the wire, in the shape the rows below describe. */
export function wireRows(requests: MockRequest[]) {
  const rows = [];
  for (const request of requests) {
    // Every value separately: a Content-Type sent twice must show up twice.
    const contentTypes: string[] = [];
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      if (request.rawHeaders[index].toLowerCase() === 'content-type') {
        contentTypes.push(request.rawHeaders[index + 1]);
      }
    }
    rows.push({
      method: request.method,
      url: request.url,
      contentTypes,
      contentLength: request.headers['content-length'],
      transferEncoding: request.headers['transfer-encoding'],
      body: request.body === undefined ? '' : request.body.toString('base64'),
    });
  }
  return rows;
}

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
export async function runProgram(
  command: string,
  args: string[],
  marker: string,
  cwd: string
): Promise<void> {
  const result = await runCommand(command, args, { cwd, timeout: 120_000 });
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain(marker);
}
