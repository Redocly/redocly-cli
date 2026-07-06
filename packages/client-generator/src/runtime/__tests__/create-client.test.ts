import { createClientCore } from '../create-client.js';
import type { OperationDescriptor } from '../types.js';

const OPS = {
  getOrder: {
    id: 'getOrder',
    method: 'GET',
    path: '/orders/{orderId}',
    params: [
      { name: 'orderId', in: 'path' },
      { name: 'expand', in: 'query' },
      { name: 'X-Trace', in: 'header' },
    ],
    tags: ['Orders'],
  },
  createPet: {
    id: 'createPet',
    method: 'post',
    path: '/pets',
    body: { contentType: 'application/json' },
  },
  listRaw: {
    id: 'listRaw',
    method: 'GET',
    path: '/raw',
    responseKind: 'text',
    params: [{ name: 'filter', in: 'query', style: 'pipeDelimited', explode: false }],
  },
  secured: {
    id: 'secured',
    method: 'GET',
    path: '/private',
    security: [{ scheme: 's', kind: 'bearer' }],
  },
  stream: {
    id: 'stream',
    method: 'GET',
    path: '/events',
    responseKind: 'sse',
    sseDataKind: 'json',
  },
  search: {
    id: 'search',
    method: 'GET',
    path: '/search',
    params: [
      { name: 'ids', in: 'query', explode: false },
      { name: 'path', in: 'query', allowReserved: true },
    ],
  },
  streamPlain: { id: 'streamPlain', method: 'GET', path: '/plain-events', responseKind: 'sse' },
  configure: { id: 'configure', method: 'GET', path: '/configure-op' }, // collision: core must win
} satisfies Record<string, OperationDescriptor>;

interface Ops {
  getOrder: {
    args: { orderId: string; params?: { expand?: string }; headers?: Record<string, unknown> };
    result: { id: string };
  };
  createPet: { args: { body: { name: string } }; result: { id: string } };
  listRaw: { args: { params?: { filter?: string[] } }; result: string };
  search: { args: { params?: { ids?: string[]; path?: string } }; result: string };
  secured: { args: Record<string, never>; result: string };
  stream: { args: Record<string, never>; result: { n: number }; kind: 'sse' };
  streamPlain: { args: Record<string, never>; result: string; kind: 'sse' };
  configure: { args: Record<string, never>; result: string };
  [k: string]: { args: object; result: unknown; kind?: 'sse' };
}

const jsonOk = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

function spy(responses: Response[]) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return responses.shift()!;
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe('createClientCore', () => {
  it('routes args: path substitution + query + body + header slot; methods survive destructuring', async () => {
    const { calls, fetchImpl } = spy([jsonOk({ id: 'o1' }), jsonOk({ id: 'p1' })]);
    const client = createClientCore<Ops>(OPS, { serverUrl: 'https://x', fetch: fetchImpl });
    const { getOrder, createPet } = client;

    expect(
      await getOrder({
        orderId: 'a/b',
        params: { expand: 'items' },
        headers: { 'X-Trace': 7, 'X-Skip': null },
      })
    ).toEqual({ id: 'o1' });
    expect(calls[0].url).toBe('https://x/orders/a%2Fb?expand=items');
    expect((calls[0].init.headers as Record<string, string>)['X-Trace']).toBe('7');
    expect('X-Skip' in (calls[0].init.headers as Record<string, string>)).toBe(false);
    expect(calls[0].init.method).toBe('GET');

    await createPet({ body: { name: 'Rex' } });
    expect(calls[1].init.method).toBe('POST'); // method upper-cased from the descriptor
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ name: 'Rex' });
  });

  it('honors descriptor query styles and responseKind (text) + per-call parseAs override', async () => {
    const { calls, fetchImpl } = spy([
      new Response('plain', { headers: { 'content-type': 'text/plain' } }),
      jsonOk(['x']),
    ]);
    const client = createClientCore<Ops>(OPS, { serverUrl: 'https://x', fetch: fetchImpl });

    expect(await client.listRaw({ params: { filter: ['a', 'b'] } })).toBe('plain');
    expect(calls[0].url).toBe('https://x/raw?filter=a|b');

    // parseAs overrides the descriptor's kind at runtime.
    expect(await client.listRaw({}, { parseAs: 'json' })).toEqual(['x']);
  });

  it('resolves OpenAPI style defaults: explode:false alone comma-joins, allowReserved alone skips encoding', async () => {
    const { calls, fetchImpl } = spy([jsonOk('s')]);
    const client = createClientCore<Ops>(OPS, { serverUrl: 'https://x', fetch: fetchImpl });
    await client.search({ params: { ids: ['a', 'b'], path: 'a/b' } });
    expect(calls[0].url).toBe('https://x/search?ids=a,b&path=a/b');
  });

  it('throw mode: non-ok becomes ApiError threaded through onError', async () => {
    const { fetchImpl } = spy([
      new Response('{"title":"x"}', {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    ]);
    const client = createClientCore<Ops>(OPS, { fetch: fetchImpl, serverUrl: 'https://x' });
    client.use(
      { onRequest: () => {} }, // no onError — skipped by the error chain
      { onError: (e) => new Error(`wrapped:${(e as { status: number }).status}`) }
    );
    await expect(client.getOrder({ orderId: '1' })).rejects.toThrow('wrapped:500');
  });

  it('result mode: non-ok returns { error }, ok returns { data } — without throwing', async () => {
    const { fetchImpl } = spy([
      new Response('{"title":"x"}', {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
      jsonOk({ id: 'ok' }),
    ]);
    const client = createClientCore<Ops>(OPS, {
      fetch: fetchImpl,
      serverUrl: 'https://x',
      errorMode: 'result',
    });
    const bad = (await client.getOrder({ orderId: '1' })) as unknown as {
      error: { title: string };
      response: Response;
    };
    expect(bad.error).toEqual({ title: 'x' });
    expect(bad.response.status).toBe(500);
    const good = (await client.getOrder({ orderId: '1' })) as unknown as { data: { id: string } };
    expect(good.data).toEqual({ id: 'ok' });
  });

  it('auth capability merges resolved headers/query before the request; auth setters feed it', async () => {
    const { calls, fetchImpl } = spy([jsonOk('ok'), jsonOk('ok'), jsonOk('ok')]);
    const client = createClientCore<Ops>(
      OPS,
      { fetch: fetchImpl, serverUrl: 'https://x' },
      {
        resolveAuth: async (_security, config) => {
          const headers: Record<string, string> = {};
          if (config.auth?.bearer) headers.Authorization = `Bearer ${config.auth.bearer as string}`;
          return { headers, query: { sig: 'v' } };
        },
      }
    );
    client.auth.bearer('T');
    await client.secured({});
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer T');
    expect(calls[0].url).toBe('https://x/private?sig=v');

    client.auth.basic('u', 'p');
    client.auth.apiKey('k', 'v');
    await client.secured({});
    expect(calls[1].url).toContain('sig=v');

    // Ops without security skip resolveAuth entirely.
    await client.getOrder({ orderId: '1' });
    expect((calls[2].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('header precedence: caller init.headers beats header params, which beat injected auth', async () => {
    const { calls, fetchImpl } = spy([jsonOk('ok'), jsonOk({ id: '1' })]);
    const client = createClientCore<Ops>(
      OPS,
      { fetch: fetchImpl, serverUrl: 'https://x' },
      {
        resolveAuth: async () => ({
          headers: { Authorization: 'Bearer injected' },
          query: {},
        }),
      }
    );
    // Caller overrides injected auth.
    await client.secured({}, { headers: { Authorization: 'Bearer mine' } });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer mine');

    // Caller overrides the explicit header-param slot too.
    await client.getOrder(
      { orderId: '1', headers: { 'X-Trace': 'from-args' } },
      { headers: { 'X-Trace': 'from-caller' } }
    );
    expect((calls[1].init.headers as Record<string, string>)['X-Trace']).toBe('from-caller');
  });

  it('configure() ignores errorMode — the generate-time mode cannot be flipped at runtime', async () => {
    const { fetchImpl } = spy([
      new Response('{"title":"x"}', {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    ]);
    const client = createClientCore<Ops>(OPS, { fetch: fetchImpl, serverUrl: 'https://x' });
    client.configure({ errorMode: 'result' });
    await expect(client.getOrder({ orderId: '1' })).rejects.toMatchObject({ status: 500 });
  });

  it('sse ops dispatch to the sse capability (with prepared url); absent capability throws sync', async () => {
    const seenUrls: string[] = [];
    const seenKinds: string[] = [];
    async function* fake(
      _config: unknown,
      _op: unknown,
      url: string,
      _init: unknown,
      dataKind: string
    ): AsyncGenerator<{ data: { n: number } }> {
      seenUrls.push(url);
      seenKinds.push(dataKind);
      yield { data: { n: 1 } };
    }
    const withCap = createClientCore<Ops>(OPS, { serverUrl: 'https://x' }, { sse: fake as never });
    const events = [];
    for await (const ev of withCap.stream({})) events.push(ev);
    expect(events).toEqual([{ data: { n: 1 } }]);

    // A bare call (no args) on an op without sseDataKind → dataKind defaults to 'text'.
    for await (const _ of withCap.streamPlain()) void _;
    expect(seenUrls).toEqual(['https://x/events', 'https://x/plain-events']);
    expect(seenKinds).toEqual(['json', 'text']);

    const noCap = createClientCore<Ops>(OPS, { serverUrl: 'https://x' });
    expect(() => noCap.stream({})).toThrow(/capability/i);
  });

  it('core members win over a colliding operation name; configure merges; use appends without mutating caller arrays', async () => {
    const mine: never[] = [];
    const client = createClientCore<Ops>(OPS, { middleware: mine });
    client.configure({ serverUrl: 'https://later' }); // the core member, not the colliding op
    client.use({ onRequest: () => {} });
    expect(mine.length).toBe(0);

    // use() also tolerates a configure() that reset middleware to undefined.
    client.configure({ middleware: undefined });
    client.use({ onRequest: () => {} });

    // The merged serverUrl is actually used.
    const { calls, fetchImpl } = spy([jsonOk({ id: '1' })]);
    client.configure({ fetch: fetchImpl });
    await client.getOrder({ orderId: '1' });
    expect(calls[0].url).toBe('https://later/orders/1');
  });

  it('defaults args to {} so no-input operations can be called bare', async () => {
    const { calls, fetchImpl } = spy([jsonOk('s')]);
    const client = createClientCore<Ops>(OPS, { fetch: fetchImpl, serverUrl: 'https://x' });
    await client.secured();
    expect(calls[0].url).toBe('https://x/private');
  });

  it('works without any initial config: serverUrl falls back to a relative URL', async () => {
    const { calls, fetchImpl } = spy([jsonOk({ id: '1' })]);
    const client = createClientCore<Ops>(OPS);
    client.configure({ fetch: fetchImpl });
    await client.getOrder({ orderId: '1' });
    expect(calls[0].url).toBe('/orders/1');
  });
});
