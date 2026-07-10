import { parseSseFrame, sse, SseParseError } from '../sse.js';
import type { SseOptions } from '../types.js';

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
/** A fixed-auth `prepare` thunk (the stream re-invokes it per connect). */
const prep =
  (url: string, init: SseOptions = {}) =>
  async () => ({ url, init });

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

  it('throws SseParseError (not a generic error) when json data is malformed', () => {
    expect(() => parseSseFrame('data: {not json', 'json')).toThrow(SseParseError);
    // text dataKind never parses, so the same payload is returned verbatim.
    expect(parseSseFrame('data: {not json', 'text')?.data).toBe('{not json');
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
      prep('https://x/events', { reconnect: false }),
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
    for await (const ev of sse({ fetch: fetchImpl }, op, prep('u', { reconnect: false }), 'text')) {
      seen.push(ev.data);
    }
    expect(seen).toEqual(['a', 'tail']);
  });

  it('splits frames on mixed CR/LF double line endings, not just matching pairs', async () => {
    // `\n\r\n` and `\r\n\r` are valid double-boundaries per the SSE spec.
    const fetchImpl = (async () =>
      streamResponse(['data: a\n\r\ndata: b\r\n\rdata: c\n\n'])) as unknown as typeof fetch;
    const seen: unknown[] = [];
    for await (const ev of sse({ fetch: fetchImpl }, op, prep('u', { reconnect: false }), 'text')) {
      seen.push(ev.data);
    }
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('surfaces a malformed JSON payload as SseParseError and does NOT reconnect', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return streamResponse(['data: {bad json\n\n']);
    }) as unknown as typeof fetch;
    await expect(async () => {
      // `reconnect` defaults to true; a parse error must still surface, not loop forever.
      for await (const _ of sse({ fetch: fetchImpl }, op, prep('u', {}), 'json')) void _;
    }).rejects.toBeInstanceOf(SseParseError);
    expect(calls).toBe(1);
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
    for await (const ev of sse(
      { fetch: fetchImpl },
      op,
      prep('u', { reconnectDelay: 1 }),
      'text'
    )) {
      seen.push(ev.data);
      if (seen.length === 2) break;
    }
    expect(seen).toEqual(['one', 'two']);
    expect(headersSeen[1]['Last-Event-ID']).toBe('5');
  });

  it('re-runs prepare on reconnect so a refreshed credential is sent (not the frozen one)', async () => {
    const authSeen: Array<string | undefined> = [];
    let token = 't1';
    let call = 0;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      authSeen.push((init.headers as Record<string, string>)?.Authorization);
      call++;
      if (call === 1) {
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(enc.encode('data: one\n\n'));
          },
          pull(c) {
            c.error(new Error('drop'));
          },
        });
        return new Response(body, { status: 200 });
      }
      return streamResponse(['data: two\n\n']);
    }) as unknown as typeof fetch;
    // A refresh-style provider: each (re)connect re-reads the current token.
    const prepare = async () => {
      const init: SseOptions = {
        reconnectDelay: 1,
        headers: { Authorization: `Bearer ${token}` },
      };
      token = 't2';
      return { url: 'u', init };
    };
    const seen: unknown[] = [];
    for await (const ev of sse({ fetch: fetchImpl }, op, prepare, 'text')) {
      seen.push(ev.data);
      if (seen.length === 2) break;
    }
    expect(seen).toEqual(['one', 'two']);
    expect(authSeen).toEqual(['Bearer t1', 'Bearer t2']); // reconnect used the fresh token
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
    for await (const ev of sse({ fetch: fetchImpl }, op, prep('u', {}), 'text')) {
      seen.push(ev.data);
      if (seen.length === 2) break;
    }
    expect(seen).toEqual(['first', 'second']);
  });

  it('throws ApiError on a non-2xx initial response (no reconnect loop)', async () => {
    const bad = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    await expect(
      (async () => {
        for await (const _ of sse({ fetch: bad }, op, prep('u', {}), 'text')) void _;
      })()
    ).rejects.toMatchObject({ status: 500 });
  });

  it('propagates transport errors when reconnect is off', async () => {
    const failing = (async () => {
      throw new Error('net down');
    }) as unknown as typeof fetch;
    await expect(
      (async () => {
        for await (const _ of sse({ fetch: failing }, op, prep('u', { reconnect: false }), 'text'))
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
      prep('u', { signal: controller.signal }),
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
    for await (const ev of sse({ fetch: noBody }, op, prep('u', {}))) seen2.push(ev); // dataKind defaults to 'text'
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
      prep('u', { signal: controller.signal }),
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
        prep('u', { signal: controller.signal }),
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
        for await (const _ of sse(
          { fetch: fetchImpl },
          op,
          prep('u', { reconnect: false }),
          'text'
        ))
          void _;
      })()
    ).rejects.toThrow(/1048576/);
  });
});
