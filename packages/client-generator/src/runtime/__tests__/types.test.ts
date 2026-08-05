import type {
  Client,
  ClientConfig,
  Envelope,
  Middleware,
  OperationContext,
  OperationDescriptor,
  RequestContext,
  RequestOptions,
  Result,
  ServerSentEvent,
  SseOptions,
} from '../types.js';

interface TestOps {
  requiredArgs: { args: { orderId: string }; result: { id: string } };
  optionalArgs: { args: { params?: { limit?: number } }; result: string[] };
  streaming: { args: Record<string, never>; result: { text: string }; kind: 'sse' };
  listOrders: {
    args: { params?: { cursor?: string; limit?: number } };
    result: { orders: Array<{ id: string }>; nextCursor?: string };
    item: { id: string };
  };
  listCafeOrders: { args: { cafeId: string }; result: { orders: string[] }; item: string };
  [key: string]: { args: object; result: unknown; kind?: 'sse'; item?: unknown };
}

// Shared by the envelope tests below.
type Customer = { id: string };
interface EnvelopeOps {
  listCustomers: {
    args: { params?: { limit?: number } };
    result: Customer[];
    headers: { paginationTotal?: number };
  };
  ping: { args: Record<string, never>; result: string };
  [key: string]: { args: object; result: unknown; headers?: object };
}

describe('Client<Ops> mapped type', () => {
  it('types methods, optionality, and sse per the Ops entry', () => {
    // Runtime stub — expectTypeOf reads only the static type, but property access must not throw.
    const client = { auth: {} } as unknown as Client<TestOps>;

    // SSE entries return typed async generators and take SseOptions.
    expectTypeOf(client.streaming).returns.toEqualTypeOf<
      AsyncGenerator<ServerSentEvent<{ text: string }>>
    >();
    expectTypeOf(client.streaming).toBeCallableWith({}, { reconnect: false } satisfies SseOptions);

    // Core members are always present.
    expectTypeOf(client.configure).toBeFunction();
    expectTypeOf(client.use).toBeFunction();
    expectTypeOf(client.auth.bearer).toBeCallableWith('token');
    expectTypeOf(client.auth.basic).toBeCallableWith('user', 'pass');
    expectTypeOf(client.auth.apiKey).toBeCallableWith('scheme', 'key');

    const _typeOnly = (): void => {
      // Assert throw-mode call sites through calls: `toBeCallableWith` / `.returns` on the
      // generic method resolve Parameters to `never` once intersected with operationId.
      void client.requiredArgs({ orderId: 'ord_1' });
      void client.requiredArgs({ orderId: 'ord_1' }, { parseAs: 'json' });
      void client.optionalArgs();
      void client.optionalArgs({ params: { limit: 5 } });
      expectTypeOf(client.requiredArgs({ orderId: 'ord_1' })).resolves.toEqualTypeOf<{
        id: string;
      }>();
      expectTypeOf(client.optionalArgs()).resolves.toEqualTypeOf<string[]>();
      // @ts-expect-error required args cannot be omitted
      void client.requiredArgs();
    };
    void _typeOnly;
  });

  it('paginated entries (with `item`) gain typed .pages/.items; other ops expose neither', () => {
    // Runtime stub with .pages/.items present so property access does not throw.
    const paginated = Object.assign(() => {}, { pages: () => {}, items: () => {} });
    const client = {
      auth: {},
      listOrders: paginated,
      listCafeOrders: paginated,
    } as unknown as Client<TestOps>;

    // .pages yields the result, .items the item type (non-generic — toBeCallableWith is fine).
    expectTypeOf(client.listOrders.pages).returns.toEqualTypeOf<
      AsyncGenerator<{ orders: Array<{ id: string }>; nextCursor?: string }>
    >();
    expectTypeOf(client.listOrders.items).returns.toEqualTypeOf<AsyncGenerator<{ id: string }>>();

    // Args optionality mirrors the method's own: all-optional → callable bare.
    expectTypeOf(client.listOrders.pages).toBeCallableWith();
    expectTypeOf(client.listOrders.items).toBeCallableWith(
      { params: { limit: 5 } },
      { parseAs: 'json' }
    );
    expectTypeOf(client.listCafeOrders.items).toBeCallableWith({ cafeId: 'c1' });
    expectTypeOf(client.listCafeOrders.items).returns.toEqualTypeOf<AsyncGenerator<string>>();

    const _typeOnly = (): void => {
      // One-shot stays callable; assert via a call (generic ThrowMethod × identity).
      void client.listOrders({ params: { cursor: 'c2' } });
      // @ts-expect-error non-paginated operations have no .pages
      void client.requiredArgs.pages;
      // @ts-expect-error non-paginated operations have no .items
      void client.optionalArgs.items;
      // @ts-expect-error required args cannot be omitted on .items either
      void client.listCafeOrders.items();
    };
    void _typeOnly;
  });

  it('result-mode paginated entries (with `page`) yield RAW pages; the method keeps the envelope', () => {
    type OrderPage = { orders: Array<{ id: string }>; nextCursor?: string };
    interface ResultOps {
      listOrders: {
        args: { params?: { cursor?: string } };
        result: Result<OrderPage, { title: string }>;
        mode: 'result';
        item: { id: string };
        page: OrderPage;
      };
      [key: string]: {
        args: object;
        result: unknown;
        kind?: 'sse';
        mode?: 'result';
        item?: unknown;
        page?: unknown;
      };
    }
    const client = {
      auth: {},
      listOrders: Object.assign(() => {}, { pages: () => {}, items: () => {} }),
    } as unknown as Client<ResultOps>;

    // The one-shot call still returns the Result envelope…
    expectTypeOf(client.listOrders).returns.resolves.toEqualTypeOf<
      Result<OrderPage, { title: string }>
    >();
    // …while .pages() yields the RAW page type and .items() the item type.
    expectTypeOf(client.listOrders.pages).returns.toEqualTypeOf<AsyncGenerator<OrderPage>>();
    expectTypeOf(client.listOrders.items).returns.toEqualTypeOf<AsyncGenerator<{ id: string }>>();
  });

  it('paginated descriptor literals satisfy OperationDescriptor', () => {
    const op = {
      id: 'listOrders',
      method: 'GET',
      path: '/orders',
      params: [{ name: 'cursor', in: 'query' }],
      pagination: {
        style: 'cursor',
        param: 'cursor',
        limitParam: 'limit',
        nextCursor: '/nextCursor',
        items: '/orders',
      },
    } as const satisfies OperationDescriptor;
    expect(op.pagination.style).toBe('cursor');
  });

  it('descriptor literals satisfy OperationDescriptor', () => {
    const op = {
      id: 'getOrder',
      method: 'GET',
      path: '/orders/{orderId}',
      params: [{ name: 'orderId', in: 'path' }],
      security: [[{ scheme: 'bearerAuth', kind: 'bearer' }]],
    } as const satisfies OperationDescriptor;
    expect(op.id).toBe('getOrder');
  });

  it('narrows ctx.operation to the literal unions on a narrowed client', () => {
    type Narrow = OperationContext<'listPets' | 'getPet', '/pets' | '/pets/{id}', 'pets'>;
    const client = { auth: {} } as unknown as Client<TestOps, Narrow>;

    // Type-only: `use` narrows the callback ctx; a base (contract-shaped) middleware
    // and a base config stay accepted (contravariance of the callback params).
    const _typeOnly = (): void => {
      client.use({
        onRequest: (ctx) => {
          expectTypeOf(ctx.operation.id).toEqualTypeOf<'listPets' | 'getPet'>();
          expectTypeOf(ctx.operation.path).toEqualTypeOf<'/pets' | '/pets/{id}'>();
          expectTypeOf(ctx.operation.tags).toEqualTypeOf<'pets'[]>();
          // @ts-expect-error a misspelled operationId has no overlap with the literal union
          if (ctx.operation.id === 'listPetss') return;
        },
      });
      const baseMiddleware: Middleware = { onRequest: (ctx) => void ctx.operation.id };
      client.use(baseMiddleware);
      const baseConfig: ClientConfig = { middleware: [baseMiddleware] };
      client.configure(baseConfig);
    };
    void _typeOnly;

    // The narrowed context stays assignable to the base shape (covariance).
    expectTypeOf<RequestContext<Narrow>>().toExtend<RequestContext>();
    expectTypeOf<ClientConfig>().toExtend<ClientConfig<Narrow>>();
  });

  it('Result discriminates on error', () => {
    // When error is present, data is typed undefined (and vice versa).
    expectTypeOf<
      Extract<Result<string, { title: string }>, { error: { title: string } }>['data']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      Extract<Result<string, { title: string }>, { error: undefined }>['data']
    >().toEqualTypeOf<string>();
    const init: RequestOptions = { retry: { retries: 1 }, parseAs: 'auto' };
    expect(init.parseAs).toBe('auto');
  });

  it('envelope: true returns { data, headers, response }; default stays the body', () => {
    const client = { auth: {} } as unknown as Client<EnvelopeOps>;

    const _typeOnly = (): void => {
      // Default stays the body; a literal envelope: true narrows to the envelope.
      expectTypeOf(client.listCustomers({ params: { limit: 1 } })).resolves.toEqualTypeOf<
        Customer[]
      >();
      expectTypeOf(
        client.listCustomers({ params: { limit: 1 } }, { envelope: true })
      ).resolves.toEqualTypeOf<Envelope<Customer[], { paginationTotal?: number }>>();
      expectTypeOf(client.listCustomers({}, { envelope: true })).resolves.toEqualTypeOf<
        Envelope<Customer[], { paginationTotal?: number }>
      >();
      // Ops without a headers slot still get an empty typed headers object.
      expectTypeOf(client.ping({}, { envelope: true })).resolves.toEqualTypeOf<
        Envelope<string, Record<string, never>>
      >();
    };
    void _typeOnly;

    const init: RequestOptions = { envelope: true };
    expect(init.envelope).toBe(true);
  });

  it('result-mode entries ignore envelope: true without changing their return type', () => {
    interface ResultModeOps {
      listCustomers: {
        args: Record<string, never>;
        result: Result<string[], { title: string }>;
        mode: 'result';
        headers: { paginationTotal?: number };
      };
      [key: string]: {
        args: object;
        result: unknown;
        mode?: 'result';
        headers?: object;
      };
    }
    const client = { auth: {} } as unknown as Client<ResultModeOps>;

    const _typeOnly = (): void => {
      expectTypeOf(client.listCustomers({}, { envelope: true })).resolves.toEqualTypeOf<
        Result<string[], { title: string }>
      >();
    };
    void _typeOnly;
  });

  it('keeps the plain body for init objects that never mention envelope', () => {
    const client = { auth: {} } as unknown as Client<EnvelopeOps>;

    const _typeOnly = (): void => {
      expectTypeOf(client.listCustomers({}, {})).resolves.toEqualTypeOf<Customer[]>();
      expectTypeOf(
        client.listCustomers({}, { headers: { 'X-Trace': '1' } })
      ).resolves.toEqualTypeOf<Customer[]>();
      expectTypeOf(
        client.listCustomers({}, { signal: new AbortController().signal, parseAs: 'json' })
      ).resolves.toEqualTypeOf<Customer[]>();
    };
    void _typeOnly;
  });

  it('returns a union when the envelope flag is widened', () => {
    const client = { auth: {} } as unknown as Client<EnvelopeOps>;

    const _typeOnly = (): void => {
      const widened = { envelope: true };
      expectTypeOf(client.listCustomers({}, widened)).resolves.toEqualTypeOf<
        Customer[] | Envelope<Customer[], { paginationTotal?: number }>
      >();

      // Exact `RequestOptions` stays the body — package-mode sugar generated before
      // envelope typed every `init` as `RequestOptions`, and widening that would break
      // upgrades that don't regenerate. Narrow with `{ envelope: true }` (or `as const`).
      const annotated: RequestOptions = { envelope: true };
      expectTypeOf(client.listCustomers({}, annotated)).resolves.toEqualTypeOf<Customer[]>();

      // The tanstack queryFn shape: a spread of possibly-envelope options plus signal.
      const spreadCall = (outer?: RequestOptions) =>
        client.listCustomers({}, { ...outer, signal: new AbortController().signal });
      expectTypeOf(spreadCall).returns.resolves.toEqualTypeOf<
        Customer[] | Envelope<Customer[], { paginationTotal?: number }>
      >();

      expectTypeOf(client.listCustomers({}, { envelope: false })).resolves.toEqualTypeOf<
        Customer[]
      >();
    };
    void _typeOnly;
  });

  it('keeps the plain body for exact RequestOptions (pre-envelope package-mode sugar)', () => {
    const client = { auth: {} } as unknown as Client<EnvelopeOps>;

    // Mimics flat sugar emitted before envelope: `(init: RequestOptions = {}) => …`.
    const oldSugar = (init: RequestOptions = {}) => client.listCustomers({}, init);

    const _typeOnly = (): void => {
      expectTypeOf(oldSugar).returns.resolves.toEqualTypeOf<Customer[]>();
      expectTypeOf(oldSugar({})).resolves.toEqualTypeOf<Customer[]>();
      expectTypeOf(oldSugar({ headers: { 'X-Trace': '1' } })).resolves.toEqualTypeOf<Customer[]>();
    };
    void _typeOnly;
  });
});
