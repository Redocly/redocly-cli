// sse-streaming — a `text/event-stream` operation is a typed async generator.
//
// `for await (const ev of streamOrderEvents())` yields `ServerSentEvent<OrderEvent>`:
// `ev.data` is the spec's item schema (`ev.id`/`ev.event`/`ev.retry` are the SSE fields).
// A DROPPED connection auto-reconnects, resuming via `Last-Event-ID` (backoff: the
// server's `retry:` value, then `reconnectDelay`, then 1s); a CLEAN stream end finishes
// the loop. Pass `reconnect: false` to surface drops as errors instead, and an
// AbortSignal (or `break`) to end the iterator cleanly — no AbortError escapes.
import {
  streamKitchenTicker,
  streamOrderEvents,
  configure,
  type OrderEvent,
} from './api/client.js';

const out = document.querySelector<HTMLPreElement>('#out')!;
const log: string[] = [];

// A canned SSE transport so the example runs offline and the reconnect is
// deterministic: connection 1 drops after two events; connection 2 resumes
// from `Last-Event-ID` and then ends cleanly.
const encoder = new TextEncoder();
const frame = (seq: number, status: OrderEvent['status']) =>
  `id: ${seq}\ndata: ${JSON.stringify({ orderId: `ord_${seq}`, status, seq })}\n\n`;
const sseBody = (frames: string[], end: 'close' | 'drop' | AbortSignal | null | undefined) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const f of frames) controller.enqueue(encoder.encode(f));
      if (end === 'close') controller.close();
      else if (end === 'drop') controller.error(new Error('connection reset'));
      // Otherwise hold the stream open until the caller aborts.
      else end?.addEventListener('abort', () => controller.error(end.reason), { once: true });
    },
  });

let connections = 0;
const canned = (async (url: string, init: RequestInit) => {
  const { pathname } = new URL(url);
  const headers = init.headers as Record<string, string>;
  let body: ReadableStream<Uint8Array>;
  if (pathname === '/order-events') {
    connections++;
    log.push(`connection ${connections} (Last-Event-ID: ${headers['Last-Event-ID'] ?? 'none'})`);
    body =
      connections === 1
        ? sseBody([frame(1, 'placed'), frame(2, 'preparing')], 'drop')
        : sseBody([frame(3, 'ready'), frame(4, 'completed')], 'close');
  } else {
    body = sseBody(['data: espresso up\n\n', 'data: two flat whites\n\n'], init.signal);
  }
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}) as unknown as typeof fetch;

configure({ serverUrl: 'https://events.cafe.example.com', fetch: canned });

async function main() {
  // 1. Typed events across an auto-reconnect. `reconnectDelay` keeps the demo snappy
  //    (the real default backs off from 1s, honoring a server `retry:` hint).
  for await (const ev of streamOrderEvents({ reconnectDelay: 50 })) {
    log.push(`  #${ev.id} order ${ev.data.orderId} → ${ev.data.status}`);
  }
  log.push('order stream ended cleanly (a clean end never reconnects)');

  // 2. Abort a held-open stream: the `for await` loop just ends — no AbortError.
  //    `reconnect: false` would instead surface a drop as a thrown error.
  const controller = new AbortController();
  for await (const ev of streamKitchenTicker({ signal: controller.signal })) {
    log.push(`  ticker: ${ev.data}`);
    if (ev.data === 'two flat whites') controller.abort();
  }
  log.push('ticker aborted — the iterator completed cleanly');

  out.textContent = log.join('\n');
}

void main();
