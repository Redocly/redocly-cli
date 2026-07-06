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
} satisfies Record<string, OperationDescriptor>;

interface Ops {
  upload: { args: { body: { file: string } }; result: unknown };
  secured: { args: Record<string, never>; result: unknown };
  stream: { args: Record<string, never>; result: { n: number }; kind: 'sse' };
  [k: string]: { args: object; result: unknown; kind?: 'sse' };
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
