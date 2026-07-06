import { middlewareChain, send } from '../send.js';
import type { ClientConfig, RequestContext } from '../types.js';

const op = { id: 'createPet', path: '/pets', tags: [] as string[] };
const ok = () =>
  new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });

function fetchSpy(responses: Array<Response | Error>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift()!;
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe('send', () => {
  it('serializes the body AFTER onRequest so middleware mutations are sent', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    const config: ClientConfig = {
      fetch: fetchImpl,
      middleware: [
        {
          onRequest: (ctx: RequestContext) => {
            (ctx.body as { name: string }).name = 'Mutated';
          },
        },
      ],
    };
    await send(config, op, 'https://x/pets', { method: 'POST' }, { name: 'Rex' }, false, {});
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'Mutated' });
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json'
    );
  });

  it('passes string/FormData/URLSearchParams/binary bodies through untouched', async () => {
    const { calls, fetchImpl } = fetchSpy([ok(), ok(), ok(), ok()]);
    const config: ClientConfig = { fetch: fetchImpl };
    await send(config, op, 'u', { method: 'POST' }, 'raw-string', false, {});
    expect(calls[0].init.body).toBe('raw-string');
    const fd = new FormData();
    await send(config, op, 'u', { method: 'POST' }, fd, false, {});
    expect(calls[1].init.body).toBe(fd);
    const usp = new URLSearchParams('a=1');
    await send(config, op, 'u', { method: 'POST' }, usp, false, {});
    expect(calls[2].init.body).toBe(usp);
    const bytes = new Uint8Array([1, 2]);
    await send(config, op, 'u', { method: 'POST' }, bytes, false, {});
    expect(calls[3].init.body).toBe(bytes);
  });

  it('keeps an explicit Content-Type instead of forcing application/json', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send(
      { fetch: fetchImpl },
      op,
      'u',
      { method: 'POST', headers: { 'content-type': 'application/vnd.custom+json' } },
      { a: 1 },
      false,
      {}
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/vnd.custom+json');
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('runs onResponse in reverse order (onion) and lets it replace the response', async () => {
    const order: string[] = [];
    const { fetchImpl } = fetchSpy([ok()]);
    const config: ClientConfig = {
      fetch: fetchImpl,
      middleware: [
        {
          onResponse: () => {
            order.push('A');
          },
        },
        {
          onResponse: () => {
            order.push('B');
            return new Response('replaced');
          },
        },
      ],
    };
    const { response } = await send(
      config,
      op,
      'https://x/pets',
      { method: 'GET' },
      undefined,
      false,
      {}
    );
    expect(order).toEqual(['B', 'A']);
    expect(await response.text()).toBe('replaced');
  });

  it('retries an idempotent request on 503, drains the abandoned body, and honors Retry-After=0', async () => {
    const drained = vi.fn().mockResolvedValue(undefined);
    const bad = new Response('busy', { status: 503, headers: { 'retry-after': '0' } });
    Object.defineProperty(bad, 'body', { value: { cancel: drained } });
    const { calls, fetchImpl } = fetchSpy([bad, ok()]);
    const { response } = await send(
      { fetch: fetchImpl, retry: { retries: 1, jitter: false } },
      op,
      'https://x/pets',
      { method: 'GET' },
      undefined,
      false,
      {}
    );
    expect(response.status).toBe(200);
    expect(calls.length).toBe(2);
    expect(drained).toHaveBeenCalled();
  });

  it('retries a transport error and merges per-call retry over the config policy', async () => {
    const { calls, fetchImpl } = fetchSpy([new Error('ECONNRESET'), ok()]);
    const { response } = await send(
      { fetch: fetchImpl, retry: { retries: 0 } },
      op,
      'u',
      { method: 'GET', retry: { retries: 2, retryDelay: 1, jitter: false } },
      undefined,
      false,
      {}
    );
    expect(response.status).toBe(200);
    expect(calls.length).toBe(2);
  });

  it('rethrows a transport error when retries are exhausted', async () => {
    const { fetchImpl } = fetchSpy([new Error('down'), new Error('down')]);
    await expect(
      send(
        { fetch: fetchImpl, retry: { retries: 1, retryDelay: 1, jitter: false } },
        op,
        'u',
        { method: 'GET' },
        undefined,
        false,
        {}
      )
    ).rejects.toThrow('down');
  });

  it('does not retry POST by default; retries when a custom retryOn opts in', async () => {
    const first = fetchSpy([new Response(null, { status: 503 }), ok()]);
    const out1 = await send(
      { fetch: first.fetchImpl, retry: { retries: 2, jitter: false } },
      op,
      'u',
      { method: 'POST' },
      undefined,
      false,
      {}
    );
    expect(out1.response.status).toBe(503);
    expect(first.calls.length).toBe(1);

    const second = fetchSpy([new Response(null, { status: 503 }), ok()]);
    const out2 = await send(
      {
        fetch: second.fetchImpl,
        retry: { retries: 2, retryDelay: 1, jitter: false, retryOn: () => true },
      },
      op,
      'u',
      { method: 'POST' },
      undefined,
      false,
      {}
    );
    expect(out2.response.status).toBe(200);
  });

  it('resolves async config.headers once and merges per-call headers over them', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send(
      { fetch: fetchImpl, headers: async () => ({ 'X-A': 'from-config', 'X-B': 'kept' }) },
      op,
      'u',
      { method: 'GET', headers: { 'X-A': 'per-call' } },
      undefined,
      false,
      {}
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['X-A']).toBe('per-call');
    expect(headers['X-B']).toBe('kept');
    expect(headers.Accept).toBe('application/json');
  });

  it('merges a plain-object config.headers too', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send(
      { fetch: fetchImpl, headers: { 'X-S': 'static' } },
      op,
      'u',
      { method: 'GET' },
      undefined,
      false,
      {}
    );
    expect((calls[0].init.headers as Record<string, string>)['X-S']).toBe('static');
  });

  it('multipart body uses the wired capability after onRequest; throws without it', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send({ fetch: fetchImpl }, op, 'u', { method: 'POST' }, { orgId: '1' }, true, {
      serializeMultipart: (b) => {
        const fd = new FormData();
        fd.append('orgId', String((b as { orgId: string }).orgId));
        return fd;
      },
    });
    expect(calls[0].init.body).toBeInstanceOf(FormData);
    await expect(
      send({ fetch: fetchImpl }, op, 'u', { method: 'POST' }, { a: 1 }, true, {})
    ).rejects.toThrow(/capability/i);
  });

  it('throws abortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('gone'));
    const { fetchImpl } = fetchSpy([ok()]);
    await expect(
      send(
        { fetch: fetchImpl },
        op,
        'u',
        { method: 'GET', signal: controller.signal },
        undefined,
        false,
        {}
      )
    ).rejects.toThrow('gone');
  });

  it('falls back to the global fetch when config.fetch is not set', async () => {
    const globalFetch = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', globalFetch);
    try {
      const { response } = await send(
        {},
        op,
        'https://x/pets',
        { method: 'GET' },
        undefined,
        false,
        {}
      );
      expect(response.status).toBe(200);
      expect(globalFetch).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('ignores a drain failure on the abandoned retry body (e.g. already locked)', async () => {
    const bad = new Response('busy', { status: 503, headers: { 'retry-after': '0' } });
    bad.body!.getReader(); // lock the stream so cancel() rejects
    const { calls, fetchImpl } = fetchSpy([bad, ok()]);
    const { response } = await send(
      { fetch: fetchImpl, retry: { retries: 1, jitter: false } },
      op,
      'https://x/pets',
      { method: 'GET' },
      undefined,
      false,
      {}
    );
    expect(response.status).toBe(200);
    expect(calls.length).toBe(2);
  });

  it('defaults the method to GET in the request context', async () => {
    const seen: string[] = [];
    const { fetchImpl } = fetchSpy([ok()]);
    await send(
      {
        fetch: fetchImpl,
        middleware: [
          {
            onRequest: (ctx) => {
              seen.push(ctx.method);
            },
          },
        ],
      },
      op,
      'u',
      {},
      undefined,
      false,
      {}
    );
    expect(seen).toEqual(['GET']);
  });
});

describe('middlewareChain', () => {
  it('folds the single config hooks in as an implicit FIRST middleware', () => {
    const onRequest = vi.fn();
    const chain = middlewareChain({ onRequest, middleware: [{ onRequest: vi.fn() }] });
    expect(chain.length).toBe(2);
    expect(chain[0].onRequest).toBe(onRequest);
  });

  it('is just config.middleware when no single hooks are set', () => {
    const mw = { onRequest: vi.fn() };
    expect(middlewareChain({ middleware: [mw] })).toEqual([mw]);
    expect(middlewareChain({})).toEqual([]);
  });
});
