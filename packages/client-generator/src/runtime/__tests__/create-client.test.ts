import { createClientCore } from '../create-client.js';
import { ApiError } from '../errors.js';
import { items as paginateItems, pages as paginatePages } from '../paginate.js';
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
  listOrders: {
    id: 'listOrders',
    method: 'GET',
    path: '/orders',
    params: [
      { name: 'cursor', in: 'query' },
      { name: 'limit', in: 'query' },
    ],
    pagination: { style: 'cursor', param: 'cursor', nextCursor: '/nextCursor', items: '/orders' },
  },
  configure: {
    id: 'configure',
    method: 'GET',
    path: '/configure-op',
    // Paginated AND colliding with a core member — the core member must still win.
    pagination: { style: 'page', param: 'page', items: '/rows' },
  },
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
  listOrders: {
    args: { params?: { cursor?: string; limit?: number } };
    result: { orders: Array<{ id: string }>; nextCursor?: string };
    item: { id: string };
  };
  configure: { args: Record<string, never>; result: string };
  [k: string]: { args: object; result: unknown; kind?: 'sse'; item?: unknown };
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

  it('configure({ auth }) merges into existing credentials instead of replacing them', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const { fetchImpl } = spy([jsonOk('ok'), jsonOk('ok'), jsonOk('ok')]);
    const client = createClientCore<Ops>(
      OPS,
      { fetch: fetchImpl, serverUrl: 'https://x' },
      {
        resolveAuth: async (_security, config) => {
          seen.push({ ...(config.auth ?? {}) });
          return { headers: {}, query: {} };
        },
      }
    );
    client.auth.basic('u', 'p');
    client.auth.apiKey('k', 'v');
    await client.secured({});

    // Only `bearer` — basic/apiKey must survive (no `auth.apiKey`, so the apiKey slot is untouched).
    client.configure({ auth: { bearer: 'B' } });
    await client.secured({});
    expect(seen[1]).toEqual({
      basic: { username: 'u', password: 'p' },
      apiKey: { k: 'v' },
      bearer: 'B',
    });

    // A new apiKey scheme merges per key, keeping the earlier one.
    client.configure({ auth: { apiKey: { k2: 'v2' } } });
    await client.secured({});
    expect(seen[2]).toEqual({
      basic: { username: 'u', password: 'p' },
      apiKey: { k: 'v', k2: 'v2' },
      bearer: 'B',
    });
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

  it('paginated ops gain .pages/.items dispatching to the capability; others get neither', async () => {
    const seen: unknown[] = [];
    const paginate = {
      pages: async function* (
        call: (args?: object, init?: object) => Promise<unknown>,
        spec: unknown,
        args?: object,
        init?: object
      ): AsyncGenerator<unknown> {
        seen.push(['pages', spec, args, init]);
        yield await call(args, init); // the method passed in performs the real request
      },
      items: async function* (
        _call: unknown,
        spec: { style: string },
        args?: object,
        init?: object
      ): AsyncGenerator<unknown> {
        seen.push(['items', spec.style, args, init]);
        yield { id: 'o9' };
      },
    };
    const { calls, fetchImpl } = spy([jsonOk({ orders: [{ id: 'o1' }] })]);
    const client = createClientCore<Ops>(
      OPS,
      { serverUrl: 'https://x', fetch: fetchImpl },
      { paginate: paginate as never }
    );

    expect(typeof client.listOrders.pages).toBe('function');
    expect(typeof client.listOrders.items).toBe('function');
    expect((client.getOrder as unknown as Record<string, unknown>).pages).toBeUndefined();
    expect((client.getOrder as unknown as Record<string, unknown>).items).toBeUndefined();

    const args = { params: { limit: 2 } };
    const init = { headers: { 'X-Trace': '1' } };
    const yielded = [];
    for await (const page of client.listOrders.pages(args, init)) yielded.push(page);
    expect(yielded).toEqual([{ orders: [{ id: 'o1' }] }]);
    expect(calls[0].url).toBe('https://x/orders?limit=2');
    expect(seen[0]).toEqual(['pages', OPS.listOrders.pagination, args, init]);

    for await (const item of client.listOrders.items()) expect(item).toEqual({ id: 'o9' });
    expect(seen[1]).toEqual(['items', 'cursor', undefined, undefined]); // bare call: no args/init
  });

  it('result mode: .pages/.items iterate RAW pages (the envelope is unwrapped before the pointers)', async () => {
    const page1 = { orders: [{ id: 'o1' }, { id: 'o2' }], nextCursor: 'c2' };
    const page2 = { orders: [{ id: 'o3' }] };
    const { calls, fetchImpl } = spy([
      jsonOk(page1),
      jsonOk(page2),
      jsonOk(page1),
      jsonOk(page2),
      jsonOk(page2),
    ]);
    const client = createClientCore<Ops>(
      OPS,
      { serverUrl: 'https://x', fetch: fetchImpl, errorMode: 'result' },
      { paginate: { pages: paginatePages, items: paginateItems } }
    );

    const pages = [];
    for await (const page of client.listOrders.pages()) pages.push(page);
    expect(pages).toEqual([page1, page2]); // raw pages, never { data, error, response }
    expect(calls.map((c) => c.url)).toEqual(['https://x/orders', 'https://x/orders?cursor=c2']);

    const items = [];
    for await (const item of client.listOrders.items()) items.push(item);
    expect(items).toEqual([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }]);

    // The one-shot call keeps the result-mode envelope.
    const envelope = (await client.listOrders()) as unknown as { data: unknown };
    expect(envelope.data).toEqual(page2);
  });

  it('result mode: a successful bodyless page (204) stops iteration cleanly, no bogus ApiError', async () => {
    // A 204 page parses to `data: undefined` with `error: undefined` — success, not failure.
    // The pointers miss on `undefined`, so iteration stops; it must NOT throw.
    const { fetchImpl } = spy([
      jsonOk({ orders: [{ id: 'o1' }], nextCursor: 'c2' }),
      new Response(null, { status: 204 }),
    ]);
    const client = createClientCore<Ops>(
      OPS,
      { serverUrl: 'https://x', fetch: fetchImpl, errorMode: 'result' },
      { paginate: { pages: paginatePages, items: paginateItems } }
    );
    const items = [];
    for await (const item of client.listOrders.items()) items.push(item);
    expect(items).toEqual([{ id: 'o1' }]);
  });

  it('result mode: a failed page aborts iteration by throwing ApiError; onError is not invoked', async () => {
    const { fetchImpl } = spy([
      jsonOk({ orders: [{ id: 'o1' }], nextCursor: 'c2' }),
      new Response('{"title":"boom"}', {
        status: 500,
        statusText: 'Server Error',
        headers: { 'content-type': 'application/json' },
      }),
    ]);
    const client = createClientCore<Ops>(
      OPS,
      { serverUrl: 'https://x', fetch: fetchImpl, errorMode: 'result' },
      { paginate: { pages: paginatePages, items: paginateItems } }
    );
    let hookCalled = false;
    client.use({
      onError: (error) => {
        hookCalled = true;
        return error;
      },
    });

    const seen: unknown[] = [];
    const error = await (async () => {
      for await (const item of client.listOrders.items()) seen.push(item);
    })().catch((e: unknown) => e);
    expect(seen).toEqual([{ id: 'o1' }]); // pages before the failure still arrive
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 500,
      statusText: 'Server Error',
      body: { title: 'boom' }, // the envelope's decoded error rides along
    });
    expect(hookCalled).toBe(false); // the onError middleware hook is throw-mode-only
  });

  it('unwired paginate capability: .pages/.items throw a descriptive error synchronously', async () => {
    const { fetchImpl } = spy([jsonOk({ orders: [] })]);
    const noCap = createClientCore<Ops>(OPS, { serverUrl: 'https://x', fetch: fetchImpl });
    expect(() => noCap.listOrders.pages()).toThrow(
      'Pagination capability not wired: cannot iterate operation "listOrders"'
    );
    expect(() => noCap.listOrders.items()).toThrow(/capability/i);
    // The plain one-shot call still works without the capability.
    expect(await noCap.listOrders()).toEqual({ orders: [] });
  });

  it('a paginated op colliding with a core member still loses to the core', () => {
    const client = createClientCore<Ops>(OPS, {});
    expect(() => client.configure({ serverUrl: 'https://x' })).not.toThrow();
    expect((client.configure as unknown as Record<string, unknown>).pages).toBeUndefined();
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
