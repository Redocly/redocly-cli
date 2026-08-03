import { TimeoutError } from '../errors.js';
import { defaultRetryOn } from '../index.js';
import { middlewareChain, send } from '../send.js';
import type { ClientConfig, RequestContext, RetryContext } from '../types.js';

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
    await send(config, op, 'https://x/pets', { method: 'POST' }, { name: 'Rex' }, undefined, {});
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'Mutated' });
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json'
    );
  });

  it('passes string/FormData/URLSearchParams/binary bodies through untouched', async () => {
    const { calls, fetchImpl } = fetchSpy([ok(), ok(), ok(), ok()]);
    const config: ClientConfig = { fetch: fetchImpl };
    await send(config, op, 'u', { method: 'POST' }, 'raw-string', undefined, {});
    expect(calls[0].init.body).toBe('raw-string');
    const fd = new FormData();
    await send(config, op, 'u', { method: 'POST' }, fd, undefined, {});
    expect(calls[1].init.body).toBe(fd);
    const usp = new URLSearchParams('a=1');
    await send(config, op, 'u', { method: 'POST' }, usp, undefined, {});
    expect(calls[2].init.body).toBe(usp);
    const bytes = new Uint8Array([1, 2]);
    await send(config, op, 'u', { method: 'POST' }, bytes, undefined, {});
    expect(calls[3].init.body).toBe(bytes);
  });

  it("defaults Content-Type to the operation's declared body content type", async () => {
    // The descriptor carries the spec's request content type (e.g. merge-patch) —
    // hardcoding application/json makes strict servers reject the PATCH.
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send(
      { fetch: fetchImpl },
      op,
      'u',
      { method: 'PATCH' },
      { name: 'x' },
      { contentType: 'application/merge-patch+json' },
      {}
    );
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'x' });
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/merge-patch+json'
    );
  });

  it('keeps an explicit Content-Type instead of forcing application/json', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send(
      { fetch: fetchImpl },
      op,
      'u',
      { method: 'POST', headers: { 'content-type': 'application/vnd.custom+json' } },
      { a: 1 },
      undefined,
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
      undefined,
      {}
    );
    expect(order).toEqual(['B', 'A']);
    expect(await response.text()).toBe('replaced');
  });

  it('cancels the abandoned original body when onResponse replaces the response', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const { fetchImpl } = fetchSpy([new Response(body, { status: 200 })]);
    const { response } = await send(
      { fetch: fetchImpl, onResponse: () => new Response('replaced', { status: 201 }) },
      op,
      'u',
      { method: 'GET' },
      undefined,
      undefined,
      {}
    );
    expect(cancelled).toBe(true);
    expect(response.status).toBe(201);
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
      undefined,
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
      undefined,
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
        undefined,
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
      undefined,
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
      undefined,
      {}
    );
    expect(out2.response.status).toBe(200);
  });

  it('sends X-Redocly-Client outside browsers; a caller header wins; false disables', async () => {
    const { calls, fetchImpl } = fetchSpy([ok(), ok(), ok()]);
    const clientHeader = 'redocly-client-generator';
    await send(
      { fetch: fetchImpl, clientHeader },
      op,
      'u',
      { method: 'GET' },
      undefined,
      undefined,
      {}
    );
    await send(
      { fetch: fetchImpl, clientHeader },
      op,
      'u',
      { method: 'GET', headers: { 'X-Redocly-Client': 'my-app/2.0' } },
      undefined,
      undefined,
      {}
    );
    await send(
      { fetch: fetchImpl, clientHeader: false },
      op,
      'u',
      { method: 'GET' },
      undefined,
      undefined,
      {}
    );
    const headerOf = (index: number) =>
      (calls[index].init.headers as Record<string, string>)['X-Redocly-Client'];
    expect(headerOf(0)).toBe('redocly-client-generator');
    expect(headerOf(1)).toBe('my-app/2.0');
    expect(headerOf(2)).toBeUndefined();
  });

  it('never sends the client header in a browser (a custom header would force CORS preflight)', async () => {
    (globalThis as { document?: unknown }).document = {};
    try {
      const { calls, fetchImpl } = fetchSpy([ok()]);
      await send(
        { fetch: fetchImpl, clientHeader: 'redocly-client-generator' },
        op,
        'u',
        { method: 'GET' },
        undefined,
        undefined,
        {}
      );
      expect((calls[0].init.headers as Record<string, string>)['X-Redocly-Client']).toBeUndefined();
    } finally {
      delete (globalThis as { document?: unknown }).document;
    }
  });

  it('idempotencyKey generates one stable key per call and makes POST retries safe by default', async () => {
    const { calls, fetchImpl } = fetchSpy([new Response(null, { status: 503 }), ok()]);
    const { response } = await send(
      {
        fetch: fetchImpl,
        idempotencyKey: true,
        retry: { retries: 1, retryDelay: 1, jitter: false },
      },
      op,
      'u',
      { method: 'POST' },
      { a: 1 },
      undefined,
      {}
    );
    // The keyed POST is retried (the default policy treats it as safe to re-send)…
    expect(response.status).toBe(200);
    expect(calls.length).toBe(2);
    // …and BOTH attempts carry the SAME key — that is the whole point of the header.
    const keys = calls.map(
      (call) => (call.init.headers as Record<string, string>)['Idempotency-Key']
    );
    expect(keys[0]).toMatch(/[0-9a-f-]{36}/);
    expect(keys[1]).toBe(keys[0]);
  });

  it('idempotencyKey: caller header and per-call key win; GET never gets one', async () => {
    const { calls, fetchImpl } = fetchSpy([ok(), ok(), ok()]);
    const config: ClientConfig = { fetch: fetchImpl, idempotencyKey: () => 'from-factory' };
    await send(config, op, 'u', { method: 'POST' }, { a: 1 }, undefined, {});
    await send(
      config,
      op,
      'u',
      { method: 'POST', headers: { 'Idempotency-Key': 'caller-set' } },
      { a: 1 },
      undefined,
      {}
    );
    await send(config, op, 'u', { method: 'GET' }, undefined, undefined, {});
    const keyOf = (index: number) =>
      (calls[index].init.headers as Record<string, string>)['Idempotency-Key'];
    expect(keyOf(0)).toBe('from-factory');
    expect(keyOf(1)).toBe('caller-set');
    expect(keyOf(2)).toBeUndefined();
  });

  it('aborts an attempt after `timeout` ms and retries it like a transport error', async () => {
    let attempts = 0;
    const fetchImpl = ((url: string, init: RequestInit) => {
      attempts++;
      if (attempts === 1) {
        // Never resolves — only the abort (the timeout) settles it.
        return new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal!.reason));
        });
      }
      return Promise.resolve(ok());
    }) as unknown as typeof fetch;
    const { response } = await send(
      { fetch: fetchImpl, timeout: 30, retry: { retries: 1, retryDelay: 1, jitter: false } },
      op,
      'u',
      { method: 'GET' },
      undefined,
      undefined,
      {}
    );
    expect(response.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it('a custom retryOn composes with the exported defaultRetryOn, keeping timeout retries', async () => {
    // The adoption footgun: `retryOn: ({ response }) => (response?.status ?? 0) >= 500`
    // REPLACES the default policy, so timeouts (no response) silently stop retrying.
    // Composing with the exported default keeps both behaviors.
    let attempts = 0;
    const fetchImpl = ((url: string, init: RequestInit) => {
      attempts++;
      if (attempts === 1) {
        return new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal!.reason));
        });
      }
      return Promise.resolve(ok());
    }) as unknown as typeof fetch;
    const { response } = await send(
      {
        fetch: fetchImpl,
        timeout: 30,
        retry: {
          retries: 1,
          retryDelay: 1,
          jitter: false,
          retryOn: (ctx: RetryContext) => defaultRetryOn(ctx) || (ctx.response?.status ?? 0) >= 500,
        },
      },
      op,
      'u',
      { method: 'GET' },
      undefined,
      undefined,
      {}
    );
    expect(response.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it('per-call timeout overrides the config value and surfaces as a STRUCTURED TimeoutError', async () => {
    // A bare DOMException("operation was aborted due to timeout") is undiagnosable in
    // logs — the wrapped error carries the operation, the effective budget, and the attempt.
    const hanging = ((url: string, init: RequestInit) =>
      new Promise((_, reject) => {
        init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
      })) as unknown as typeof fetch;
    const rejection = send(
      { fetch: hanging, timeout: 60_000 },
      op,
      'u',
      { method: 'GET', timeout: 20 },
      undefined,
      undefined,
      {}
    );
    await expect(rejection).rejects.toBeInstanceOf(TimeoutError);
    await expect(rejection).rejects.toMatchObject({
      name: 'TimeoutError',
      operationId: 'createPet',
      timeout: 20,
      attempt: 1,
    });
    await expect(rejection).rejects.toThrow('"createPet" timed out after 20 ms');
  });

  it('resolves async config.headers once and merges per-call headers over them', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send(
      { fetch: fetchImpl, headers: async () => ({ 'X-A': 'from-config', 'X-B': 'kept' }) },
      op,
      'u',
      { method: 'GET', headers: { 'X-A': 'per-call' } },
      undefined,
      undefined,
      {}
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['X-A']).toBe('per-call');
    expect(headers['X-B']).toBe('kept');
    expect(headers.Accept).toBe('application/json');
  });

  it('honors per-call headers given as a Headers instance or entry pairs (not just a record)', async () => {
    const { calls, fetchImpl } = fetchSpy([ok(), ok()]);
    await send(
      { fetch: fetchImpl },
      op,
      'u',
      { method: 'GET', headers: new Headers({ 'X-Trace': 'from-headers-instance' }) },
      undefined,
      undefined,
      {}
    );
    // Header names round-trip lowercased through `Headers`; HTTP treats them case-insensitively.
    expect((calls[0].init.headers as Record<string, string>)['x-trace']).toBe(
      'from-headers-instance'
    );

    await send(
      { fetch: fetchImpl },
      op,
      'u',
      { method: 'GET', headers: [['X-Trace', 'from-pairs']] },
      undefined,
      undefined,
      {}
    );
    expect((calls[1].init.headers as Record<string, string>)['X-Trace']).toBe('from-pairs');
  });

  it('merges a plain-object config.headers too', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    await send(
      { fetch: fetchImpl, headers: { 'X-S': 'static' } },
      op,
      'u',
      { method: 'GET' },
      undefined,
      undefined,
      {}
    );
    expect((calls[0].init.headers as Record<string, string>)['X-S']).toBe('static');
  });

  it('multipart body uses the wired capability after onRequest; throws without it', async () => {
    const { calls, fetchImpl } = fetchSpy([ok()]);
    const multipartBody = { contentType: 'multipart/form-data', multipart: true };
    await send({ fetch: fetchImpl }, op, 'u', { method: 'POST' }, { orgId: '1' }, multipartBody, {
      serializeMultipart: (b) => {
        const fd = new FormData();
        fd.append('orgId', String((b as { orgId: string }).orgId));
        return fd;
      },
    });
    expect(calls[0].init.body).toBeInstanceOf(FormData);
    await expect(
      send({ fetch: fetchImpl }, op, 'u', { method: 'POST' }, { a: 1 }, multipartBody, {})
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
        undefined,
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
        undefined,
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
      undefined,
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
      undefined,
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
