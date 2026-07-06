import { parseSseFrame, sse } from '../sse.js';

const enc = new TextEncoder();
function streamResponse(chunks: string[], opts: { status?: number } = {}) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(enc.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, {
    status: opts.status ?? 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}
const op = { id: 'stream', path: '/events', tags: [] as string[] };

describe('parseSseFrame', () => {
  it('parses event/id/retry and multi-line data (joined with \\n); json dataKind parses', () => {
    const ev = parseSseFrame('event: tick\nid: 7\nretry: 250\ndata: {"n":1}', 'json');
    expect(ev).toEqual({ event: 'tick', id: '7', retry: 250, data: { n: 1 } });
    const multi = parseSseFrame('data: line1\ndata: line2', 'text');
    expect(multi?.data).toBe('line1\nline2');
  });

  it('handles bare field names, no-space values, and invalid retry', () => {
    const ev = parseSseFrame('data\nretry: soon', 'text');
    expect(ev).toEqual({ event: undefined, data: '', id: undefined, retry: undefined });
    expect(parseSseFrame('data:tight', 'text')?.data).toBe('tight');
  });

  it('returns undefined for comment-only frames and ignores unknown fields', () => {
    expect(parseSseFrame(': keepalive', 'text')).toBeUndefined();
    expect(parseSseFrame('foo: bar\ndata: x', 'text')?.data).toBe('x');
  });
});

describe('sse', () => {
  it('yields events and FLUSHES a final frame that lacks a trailing separator', async () => {
    const fetchImpl = (async () =>
      streamResponse(['data: a\n\n', 'id: 9\nretry: 5\ndata: final'])) as unknown as typeof fetch;
    const seen: unknown[] = [];
    for await (const ev of sse(
      { fetch: fetchImpl },
      op,
      'https://x/events',
      { reconnect: false },
      'text'
    )) {
      seen.push(ev.data);
    }
    expect(seen).toEqual(['a', 'final']);
  });

  it('skips comment-only frames mid-stream and flushes a plain (no id/retry) final frame', async () => {
    const fetchImpl = (async () =>
      streamResponse(['data: a\n\n', ': ping\n\n', 'data: tail'])) as unknown as typeof fetch;
    const seen: unknown[] = [];
    for await (const ev of sse({ fetch: fetchImpl }, op, 'u', { reconnect: false }, 'text')) {
      seen.push(ev.data);
    }
    expect(seen).toEqual(['a', 'tail']);
  });

  it('reconnects after a drop, resuming with Last-Event-ID', async () => {
    const headersSeen: Array<Record<string, string>> = [];
    let call = 0;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      headersSeen.push({ ...(init.headers as Record<string, string>) });
      call++;
      if (call === 1) {
        // enqueue in start, error in pull: the chunk is read first, THEN the stream drops
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(enc.encode('id: 5\ndata: one\n\n'));
          },
          pull(controller) {
            controller.error(new Error('drop'));
          },
        });
        return new Response(body, { status: 200 });
      }
      return streamResponse(['data: two\n\n']);
    }) as unknown as typeof fetch;
    const seen: unknown[] = [];
    for await (const ev of sse({ fetch: fetchImpl }, op, 'u', { reconnectDelay: 1 }, 'text')) {
      seen.push(ev.data);
      if (seen.length === 2) break;
    }
    expect(seen).toEqual(['one', 'two']);
    expect(headersSeen[1]['Last-Event-ID']).toBe('5');
  });

  it('honors the server retry: field for the backoff base and reconnects on empty bodies', async () => {
    let call = 0;
    const fetchImpl = (async () => {
      call++;
      if (call === 1) {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(enc.encode('retry: 1\ndata: first\n\n'));
          },
          pull(controller) {
            controller.error(new Error('drop'));
          },
        });
        return new Response(body, { status: 200 });
      }
      return streamResponse(['data: second\n\n']);
    }) as unknown as typeof fetch;
    const seen: unknown[] = [];
    for await (const ev of sse({ fetch: fetchImpl }, op, 'u', {}, 'text')) {
      seen.push(ev.data);
      if (seen.length === 2) break;
    }
    expect(seen).toEqual(['first', 'second']);
  });

  it('throws ApiError on a non-2xx initial response (no reconnect loop)', async () => {
    const bad = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    await expect(
      (async () => {
        for await (const _ of sse({ fetch: bad }, op, 'u', {}, 'text')) void _;
      })()
    ).rejects.toMatchObject({ status: 500 });
  });

  it('propagates transport errors when reconnect is off', async () => {
    const failing = (async () => {
      throw new Error('net down');
    }) as unknown as typeof fetch;
    await expect(
      (async () => {
        for await (const _ of sse({ fetch: failing }, op, 'u', { reconnect: false }, 'text'))
          void _;
      })()
    ).rejects.toThrow('net down');
  });

  it('returns cleanly on a pre-aborted signal and on a body-less response', async () => {
    const controller = new AbortController();
    controller.abort();
    const okFetch = (async () => streamResponse(['data: x\n\n'])) as unknown as typeof fetch;
    const seen: unknown[] = [];
    for await (const ev of sse(
      { fetch: okFetch },
      op,
      'u',
      { signal: controller.signal },
      'text'
    )) {
      seen.push(ev);
    }
    expect(seen).toEqual([]);

    const noBody = (async () => {
      const r = new Response(null, { status: 200 });
      Object.defineProperty(r, 'body', { value: null });
      return r;
    }) as unknown as typeof fetch;
    const seen2: unknown[] = [];
    for await (const ev of sse({ fetch: noBody }, op, 'u', {})) seen2.push(ev); // dataKind defaults to 'text'
    expect(seen2).toEqual([]);
  });

  it('ends cleanly when the signal aborts during streaming (no reconnect attempt)', async () => {
    const controller = new AbortController();
    const fetchImpl = (async () => {
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(enc.encode('data: one\n\n'));
        },
        pull(c) {
          c.error(new Error('drop'));
        },
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;
    const seen: unknown[] = [];
    for await (const ev of sse(
      { fetch: fetchImpl },
      op,
      'u',
      { signal: controller.signal },
      'text'
    )) {
      seen.push(ev.data);
      controller.abort(); // the subsequent read error must be treated as an abort, not a drop
    }
    expect(seen).toEqual(['one']);
  });

  it('ends cleanly when the signal aborts during the reconnect backoff (default 1s base)', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic 500ms backoff
    try {
      const controller = new AbortController();
      const failing = (async () => {
        setTimeout(() => controller.abort(), 10); // abort while sse sleeps before reconnecting
        throw new Error('net down');
      }) as unknown as typeof fetch;
      const seen: unknown[] = [];
      for await (const ev of sse(
        { fetch: failing },
        op,
        'u',
        { signal: controller.signal },
        'text'
      )) {
        seen.push(ev);
      }
      expect(seen).toEqual([]);
    } finally {
      random.mockRestore();
    }
  });

  it('guards against unbounded frames (no delimiter past 1 MiB)', async () => {
    const big = 'data: ' + 'x'.repeat(1_100_000); // no trailing delimiter, single chunk
    const fetchImpl = (async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(enc.encode(big));
          // keep the stream open so `done` stays false after the big chunk
        },
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;
    await expect(
      (async () => {
        for await (const _ of sse({ fetch: fetchImpl }, op, 'u', { reconnect: false }, 'text'))
          void _;
      })()
    ).rejects.toThrow(/1048576/);
  });
});
