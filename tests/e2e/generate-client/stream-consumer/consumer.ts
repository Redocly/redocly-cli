// Runtime smoke for stream request bodies in the generated TypeScript client. Run by
// stream-bodies.test.ts with the echo server's base URL as the only argument. It only
// makes the calls, in a fixed order; the test reads what the server received.
import { Readable } from 'node:stream';

import { ApiError, client } from './client/client.js';

const MULTIPART =
  '--redocly\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello stream\r\n--redocly--\r\n';
const BINARY = Uint8Array.from({ length: 256 }, (_, index) => index);

function stream(payload: Uint8Array | string): ReadableStream {
  return Readable.toWeb(Readable.from([Buffer.from(payload)])) as ReadableStream;
}

async function expectUnavailable(call: Promise<void>): Promise<void> {
  try {
    await call;
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) return;
    throw error;
  }
  throw new Error('expected a 503 ApiError');
}

client.configure({
  serverUrl: process.argv[2],
  retry: { retries: 2, retryDelay: 1, retryOn: () => true },
});

// Streams: the body passes through untouched and is sent once, even under /fail/.
await client.upload({ body: stream(MULTIPART) });
await client.uploadBlob({ path: { name: 'declared' }, body: stream(BINARY) });
await expectUnavailable(client.uploadFailing({ path: { kind: 'stream' }, body: stream(BINARY) }));

// Replayable bodies: the caller's Content-Type wins, and the retry policy still applies.
await client.uploadBlob(
  { path: { name: 'custom' }, body: new Blob([BINARY]) },
  { headers: { 'content-type': 'application/x-custom' } }
);
await expectUnavailable(
  client.uploadFailing({ path: { kind: 'bytes' }, body: new Blob([BINARY]) })
);

process.stdout.write('TYPESCRIPT_SMOKE_OK\n');
