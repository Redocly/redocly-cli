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

type Order = { id: string };
type OrderPage = { orders: Order[]; nextCursor?: string };
type Problem = { title: string };
type Customer = { id: string };
type CustomerHeaders = { paginationTotal?: number };
type CustomersEnvelope = Envelope<Customer[], CustomerHeaders>;

interface Ops {
  getOrder: { args: { orderId: string }; result: Order };
  listTags: { args: { params?: { limit?: number } }; result: string[] };
  streamMessages: { args: Record<string, never>; result: { text: string }; kind: 'sse' };
  listOrders: {
    args: { params?: { cursor?: string; limit?: number } };
    result: OrderPage;
    item: Order;
  };
  listCafeOrders: { args: { cafeId: string }; result: { orders: string[] }; item: string };
  [key: string]: { args: object; result: unknown; kind?: 'sse'; item?: unknown };
}

interface ResultModeOps {
  listOrders: {
    args: { params?: { cursor?: string } };
    result: Result<OrderPage, Problem>;
    mode: 'result';
    item: Order;
    page: OrderPage;
  };
  listCustomers: {
    args: Record<string, never>;
    result: Result<Customer[], Problem>;
    mode: 'result';
    headers: CustomerHeaders;
  };
  [key: string]: {
    args: object;
    result: unknown;
    mode?: 'result';
    item?: unknown;
    page?: unknown;
    headers?: object;
  };
}

interface EnvelopeOps {
  listCustomers: {
    args: { params?: { limit?: number } };
    result: Customer[];
    headers: CustomerHeaders;
  };
  ping: { args: Record<string, never>; result: string };
  [key: string]: { args: object; result: unknown; headers?: object };
}

type PetsContext = OperationContext<'listPets' | 'getPet', '/pets' | '/pets/{id}', 'pets'>;

// This file is only type-checked, so each client needs a type and no value.
declare const client: Client<Ops>;
declare const resultModeClient: Client<ResultModeOps>;
declare const envelopeClient: Client<EnvelopeOps>;
declare const petsClient: Client<Ops, PetsContext>;

describe('operation methods', () => {
  // The methods are generic over the operationId, so `toBeCallableWith` and `.returns` resolve
  // their parameters to `never`. The checks call the methods instead.
  it('resolve to the result of the operation', () => {
    expectTypeOf(client.getOrder({ orderId: 'ord_1' })).resolves.toEqualTypeOf<Order>();
    expectTypeOf(client.listTags()).resolves.toEqualTypeOf<string[]>();
  });

  it('take request options after the args', () => {
    expectTypeOf(
      client.getOrder({ orderId: 'ord_1' }, { parseAs: 'json' })
    ).resolves.toEqualTypeOf<Order>();
    expectTypeOf(client.listTags({ params: { limit: 5 } })).resolves.toEqualTypeOf<string[]>();
  });

  it('require the args when the operation has a required one', () => {
    // @ts-expect-error -- `orderId` is required
    assertType(client.getOrder());
  });

  it('return an async generator of events for an sse operation', () => {
    expectTypeOf(client.streamMessages).returns.toEqualTypeOf<
      AsyncGenerator<ServerSentEvent<{ text: string }>>
    >();
    expectTypeOf(client.streamMessages).toBeCallableWith({}, {
      reconnect: false,
    } satisfies SseOptions);
  });
});

describe('client members', () => {
  it('include configure, use, and the auth helpers', () => {
    expectTypeOf(client.configure).toBeFunction();
    expectTypeOf(client.use).toBeFunction();
    expectTypeOf(client.auth.bearer).toBeCallableWith('token');
    expectTypeOf(client.auth.basic).toBeCallableWith('user', 'pass');
    expectTypeOf(client.auth.apiKey).toBeCallableWith('scheme', 'key');
  });
});

describe('pagination', () => {
  it('gives a paginated operation .pages of results and .items of items', () => {
    expectTypeOf(client.listOrders.pages).returns.toEqualTypeOf<AsyncGenerator<OrderPage>>();
    expectTypeOf(client.listOrders.items).returns.toEqualTypeOf<AsyncGenerator<Order>>();
    expectTypeOf(client.listCafeOrders.items).returns.toEqualTypeOf<AsyncGenerator<string>>();
  });

  it('keeps the one-shot call of a paginated operation', () => {
    expectTypeOf(
      client.listOrders({ params: { cursor: 'c2' } })
    ).resolves.toEqualTypeOf<OrderPage>();
  });

  it('takes the same args and options in .pages and .items as in the method', () => {
    expectTypeOf(client.listOrders.pages).toBeCallableWith();
    expectTypeOf(client.listOrders.items).toBeCallableWith(
      { params: { limit: 5 } },
      { parseAs: 'json' }
    );
    expectTypeOf(client.listCafeOrders.items).toBeCallableWith({ cafeId: 'c1' });
  });

  it('requires the args in .items when the operation has a required one', () => {
    // @ts-expect-error -- `cafeId` is required
    assertType(client.listCafeOrders.items());
  });

  it('gives an operation without pagination neither .pages nor .items', () => {
    expectTypeOf(client.getOrder).not.toHaveProperty('pages');
    expectTypeOf(client.listTags).not.toHaveProperty('items');
  });

  it('yields raw pages in result mode while the method keeps the Result', () => {
    expectTypeOf(resultModeClient.listOrders).returns.resolves.toEqualTypeOf<
      Result<OrderPage, Problem>
    >();
    expectTypeOf(resultModeClient.listOrders.pages).returns.toEqualTypeOf<
      AsyncGenerator<OrderPage>
    >();
    expectTypeOf(resultModeClient.listOrders.items).returns.toEqualTypeOf<AsyncGenerator<Order>>();
  });
});

describe('envelope option', () => {
  it('returns the body by default', () => {
    expectTypeOf(envelopeClient.listCustomers({ params: { limit: 1 } })).resolves.toEqualTypeOf<
      Customer[]
    >();
  });

  it('returns the body when the options do not mention envelope', () => {
    expectTypeOf(envelopeClient.listCustomers({}, {})).resolves.toEqualTypeOf<Customer[]>();
    expectTypeOf(
      envelopeClient.listCustomers({}, { headers: { 'X-Trace': '1' } })
    ).resolves.toEqualTypeOf<Customer[]>();
    expectTypeOf(
      envelopeClient.listCustomers({}, { signal: new AbortController().signal, parseAs: 'json' })
    ).resolves.toEqualTypeOf<Customer[]>();
  });

  it('returns the body with envelope: false', () => {
    expectTypeOf(envelopeClient.listCustomers({}, { envelope: false })).resolves.toEqualTypeOf<
      Customer[]
    >();
  });

  it('returns the data, the typed headers, and the response with envelope: true', () => {
    expectTypeOf(
      envelopeClient.listCustomers({ params: { limit: 1 } }, { envelope: true })
    ).resolves.toEqualTypeOf<CustomersEnvelope>();
    expectTypeOf(
      envelopeClient.listCustomers({}, { envelope: true })
    ).resolves.toEqualTypeOf<CustomersEnvelope>();
  });

  it('types the headers as an empty object when the operation declares none', () => {
    expectTypeOf(envelopeClient.ping({}, { envelope: true })).resolves.toEqualTypeOf<
      Envelope<string, Record<string, never>>
    >();
  });

  it('returns a union when the envelope flag is a boolean', () => {
    const options = { envelope: true };
    expectTypeOf(envelopeClient.listCustomers({}, options)).resolves.toEqualTypeOf<
      Customer[] | CustomersEnvelope
    >();
  });

  it('returns a union for spread options, as the tanstack queryFn passes them', () => {
    const queryFn = (options?: RequestOptions) =>
      envelopeClient.listCustomers({}, { ...options, signal: new AbortController().signal });
    expectTypeOf(queryFn).returns.resolves.toEqualTypeOf<Customer[] | CustomersEnvelope>();
  });

  // Clients generated before the envelope option typed every `init` as `RequestOptions`.
  // Widening that to a union would break their callers until they regenerate.
  it('returns the body for options typed as RequestOptions', () => {
    const options: RequestOptions = { envelope: true };
    const listCustomers = (init: RequestOptions = {}) => envelopeClient.listCustomers({}, init);

    expectTypeOf(envelopeClient.listCustomers({}, options)).resolves.toEqualTypeOf<Customer[]>();
    expectTypeOf(listCustomers).returns.resolves.toEqualTypeOf<Customer[]>();
    expectTypeOf(listCustomers({ headers: { 'X-Trace': '1' } })).resolves.toEqualTypeOf<
      Customer[]
    >();
  });

  it('is ignored in result mode', () => {
    expectTypeOf(resultModeClient.listCustomers({}, { envelope: true })).resolves.toEqualTypeOf<
      Result<Customer[], Problem>
    >();
  });
});

describe('operation context', () => {
  it('narrows ctx.operation to the operations of a narrowed client', () => {
    petsClient.use({
      onRequest: (ctx) => {
        expectTypeOf(ctx.operation.id).toEqualTypeOf<'listPets' | 'getPet'>();
        expectTypeOf(ctx.operation.path).toEqualTypeOf<'/pets' | '/pets/{id}'>();
        expectTypeOf(ctx.operation.tags).toEqualTypeOf<'pets'[]>();
      },
    });
  });

  it('lets a narrowed client accept a base middleware and a base config', () => {
    const middleware: Middleware = { onRequest: (ctx) => void ctx.operation.id };
    const config: ClientConfig = { middleware: [middleware] };

    expectTypeOf(petsClient.use).toBeCallableWith(middleware);
    expectTypeOf(petsClient.configure).toBeCallableWith(config);
    expectTypeOf<ClientConfig>().toExtend<ClientConfig<PetsContext>>();
  });

  it('keeps a narrowed request context assignable to the base one', () => {
    expectTypeOf<RequestContext<PetsContext>>().toExtend<RequestContext>();
  });
});

describe('Result', () => {
  it('types data as undefined when there is an error, and the reverse', () => {
    expectTypeOf<
      Extract<Result<string, Problem>, { error: Problem }>['data']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      Extract<Result<string, Problem>, { error: undefined }>['data']
    >().toEqualTypeOf<string>();
  });
});

describe('RequestOptions', () => {
  it('accepts retry and parseAs', () => {
    assertType<RequestOptions>({ retry: { retries: 1 }, parseAs: 'auto' });
  });
});

describe('OperationDescriptor', () => {
  it('accepts a descriptor literal with pagination', () => {
    expectTypeOf({
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
    } as const).toExtend<OperationDescriptor>();
  });

  it('accepts a descriptor literal with security', () => {
    expectTypeOf({
      id: 'getOrder',
      method: 'GET',
      path: '/orders/{orderId}',
      params: [{ name: 'orderId', in: 'path' }],
      security: [[{ scheme: 'bearerAuth', kind: 'bearer' }]],
    } as const).toExtend<OperationDescriptor>();
  });
});
