import { configure, sse } from './api.js';

// No real server: inject a `fetch` that fails the first attempt with a transport-style
// error (as if the connection were refused/reset while opening the request), then
// succeeds. With the fix, __sse must treat a __send failure as a dropped connection and
// reconnect — not rethrow on the first error.
let calls = 0;
configure({
  fetch: (async () => {
    calls++;
    if (calls === 1) throw new TypeError('simulated connection failure');
    const body = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('id: 1\ndata: {"text":"a","seq":1}\n\n'));
        c.close();
      },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as unknown as typeof fetch,
});

async function main(): Promise<void> {
  const events: string[] = [];
  // Tiny reconnect backoff so the test doesn't wait on the 1s default.
  for await (const ev of sse.streamMessages({ reconnectDelay: 1 })) {
    events.push(ev.data.text);
  }
  process.stdout.write(JSON.stringify({ calls, events, finished: true }) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
