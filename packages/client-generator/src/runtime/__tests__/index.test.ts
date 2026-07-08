import { defineClientSetup, type Middleware } from '../../runtime-contract.js';
import { ApiError, createClient, mergeSetup, type OperationDescriptor } from '../index.js';

const OPS = {
  upload: {
    id: 'upload',
    method: 'POST',
    path: '/up',
    body: { contentType: 'multipart/form-data', multipart: true },
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
  listOrders: {
    id: 'listOrders',
    method: 'GET',
    path: '/orders',
    params: [{ name: 'cursor', in: 'query' }],
    pagination: { style: 'cursor', param: 'cursor', nextCursor: '/nextCursor', items: '/orders' },
  },
} satisfies Record<string, OperationDescriptor>;

interface Ops {
  upload: { args: { body: { file: string } }; result: unknown };
  secured: { args: Record<string, never>; result: unknown };
  stream: { args: Record<string, never>; result: { n: number }; kind: 'sse' };
  listOrders: {
    args: { params?: { cursor?: string } };
    result: { orders: Array<{ id: string }>; nextCursor?: string };
    item: { id: string };
  };
  [k: string]: { args: object; result: unknown; kind?: 'sse'; item?: unknown };
}

describe('public surface', () => {
  it('createClient wires all capabilities: multipart, auth, and sse work without manual caps', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/events')) {
        return new Response(new TextEncoder().encode('data: {"n":1}\n\n'), {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        });
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;

    const client = createClient<Ops>(OPS, { serverUrl: 'https://x', fetch: fetchImpl });

    await client.upload({ body: { file: 'f' } });
    expect(calls[0].init.body).toBeInstanceOf(FormData);

    client.auth.bearer('T');
    await client.secured();
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer T');

    const events = [];
    for await (const ev of client.stream({}, { reconnect: false })) events.push(ev.data);
    expect(events).toEqual([{ n: 1 }]);
  });

  it('createClient wires the paginate capability: .items walks cursor pages end-to-end', async () => {
    const pagesByCursor: Record<string, unknown> = {
      first: { orders: [{ id: 'o1' }, { id: 'o2' }], nextCursor: 'c2' },
      c2: { orders: [{ id: 'o3' }] },
    };
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      const cursor = new URL(url).searchParams.get('cursor') ?? 'first';
      return new Response(JSON.stringify(pagesByCursor[cursor]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    const client = createClient<Ops>(OPS, { serverUrl: 'https://x', fetch: fetchImpl });

    const ids: string[] = [];
    for await (const order of client.listOrders.items()) ids.push(order.id);
    expect(ids).toEqual(['o1', 'o2', 'o3']);
    expect(urls).toEqual(['https://x/orders', 'https://x/orders?cursor=c2']);

    const pageSizes: number[] = [];
    for await (const page of client.listOrders.pages()) pageSizes.push(page.orders.length);
    expect(pageSizes).toEqual([2, 1]);
  });

  it('mergeSetup: config wins per-field; middleware composes setup-first', () => {
    const setup = {
      config: { serverUrl: 'https://baked', retry: { retries: 3 } },
      middleware: [{ onRequest: () => {} }],
    };
    const merged = mergeSetup(setup, {
      serverUrl: 'https://mine',
      middleware: [{ onResponse: () => {} }],
    });
    expect(merged.serverUrl).toBe('https://mine');
    expect(merged.retry).toEqual({ retries: 3 });
    expect(merged.middleware!.length).toBe(2);
    expect(merged.middleware![0].onRequest).toBeDefined(); // baked first
  });

  it('mergeSetup tolerates an absent setup and absent config', () => {
    expect(mergeSetup(undefined)).toEqual({ middleware: [] });
  });

  it('accepts a contract-typed setup from defineClientSetup (assignability pin)', () => {
    // Compiles only while runtime-contract types stay assignable to the runtime's.
    const setup = defineClientSetup({
      config: { serverUrl: 'https://baked', retry: { retries: 2 } },
      middleware: [
        {
          onRequest: (ctx) => {
            ctx.headers['X-Op'] = ctx.operation.id;
          },
        },
      ],
    });
    const merged = mergeSetup(setup, {});
    expect(merged.serverUrl).toBe('https://baked');
    expect(merged.middleware).toHaveLength(1);
  });

  it('narrowed createClient: literal ctx.operation, contract middleware and mergeSetup accepted', () => {
    // The generated wiring's shape: literal type args + a mergeSetup-produced (base) config.
    const narrowed = createClient<Ops, 'upload' | 'secured' | 'stream'>(
      OPS,
      mergeSetup(defineClientSetup({ config: { serverUrl: 'https://baked' } }), {})
    );
    // A contract-typed (base) middleware is accepted by the narrowed use().
    const contractMiddleware: Middleware = {
      onRequest: (ctx) => {
        ctx.headers['X-Op'] = ctx.operation.id;
      },
    };
    narrowed.use(contractMiddleware);
    expect(typeof narrowed.upload).toBe('function');

    const _typeOnly = (): void => {
      narrowed.use({
        onRequest: (ctx) => {
          expectTypeOf(ctx.operation.id).toEqualTypeOf<'upload' | 'secured' | 'stream'>();
          // @ts-expect-error a misspelled operationId has no overlap with the literal union
          if (ctx.operation.id === 'uploda') return;
        },
      });
    };
    void _typeOnly;
  });

  it('exports ApiError', () => {
    expect(new ApiError('u', 500, 'x', null)).toBeInstanceOf(Error);
  });
});
