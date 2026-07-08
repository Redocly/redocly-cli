import type {
  Client,
  ClientConfig,
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

describe('Client<Ops> mapped type', () => {
  it('types methods, optionality, and sse per the Ops entry', () => {
    // Runtime stub — expectTypeOf reads only the static type, but property access must not throw.
    const client = { auth: {} } as unknown as Client<TestOps>;

    expectTypeOf(client.requiredArgs).toBeCallableWith({ orderId: 'ord_1' });
    expectTypeOf(client.requiredArgs).toBeCallableWith({ orderId: 'ord_1' }, { parseAs: 'json' });
    expectTypeOf(client.requiredArgs).returns.resolves.toEqualTypeOf<{ id: string }>();

    // All-optional args → the args object itself is optional.
    expectTypeOf(client.optionalArgs).toBeCallableWith();
    expectTypeOf(client.optionalArgs).toBeCallableWith({ params: { limit: 5 } });
    expectTypeOf(client.optionalArgs).returns.resolves.toEqualTypeOf<string[]>();

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

    // The one-shot method is unchanged; .pages yields the result, .items the item type.
    expectTypeOf(client.listOrders).toBeCallableWith({ params: { cursor: 'c2' } });
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
        item: { id: string };
        page: OrderPage;
      };
      [key: string]: {
        args: object;
        result: unknown;
        kind?: 'sse';
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
      security: [{ scheme: 'bearerAuth', kind: 'bearer' }],
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
});
