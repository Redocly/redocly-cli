// Never called: each function only gives the type checks a scope and a typed client.
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

// Shared by the envelope checks below.
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

// Methods, optionality, and SSE follow the Ops entry.
export function methodsFollowTheOpsEntry(client: Client<TestOps>): void {
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

  // Throw-mode call sites are checked through calls: `toBeCallableWith` and `.returns` on the
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
}

// Paginated entries (with `item`) gain typed .pages and .items; other operations expose neither.
export function paginatedEntriesGainPagesAndItems(client: Client<TestOps>): void {
  // .pages yields the result, .items the item type (non-generic, so toBeCallableWith works).
  expectTypeOf(client.listOrders.pages).returns.toEqualTypeOf<
    AsyncGenerator<{ orders: Array<{ id: string }>; nextCursor?: string }>
  >();
  expectTypeOf(client.listOrders.items).returns.toEqualTypeOf<AsyncGenerator<{ id: string }>>();

  // Args optionality mirrors the method's own: all-optional means callable bare.
  expectTypeOf(client.listOrders.pages).toBeCallableWith();
  expectTypeOf(client.listOrders.items).toBeCallableWith(
    { params: { limit: 5 } },
    { parseAs: 'json' }
  );
  expectTypeOf(client.listCafeOrders.items).toBeCallableWith({ cafeId: 'c1' });
  expectTypeOf(client.listCafeOrders.items).returns.toEqualTypeOf<AsyncGenerator<string>>();

  // The one-shot call stays callable.
  void client.listOrders({ params: { cursor: 'c2' } });
  // @ts-expect-error non-paginated operations have no .pages
  void client.requiredArgs.pages;
  // @ts-expect-error non-paginated operations have no .items
  void client.optionalArgs.items;
  // @ts-expect-error required args cannot be omitted on .items either
  void client.listCafeOrders.items();
}

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

// Result-mode paginated entries (with `page`) yield raw pages; the method keeps the envelope.
export function resultModePagesAreRaw(client: Client<ResultOps>): void {
  expectTypeOf(client.listOrders).returns.resolves.toEqualTypeOf<
    Result<OrderPage, { title: string }>
  >();
  expectTypeOf(client.listOrders.pages).returns.toEqualTypeOf<AsyncGenerator<OrderPage>>();
  expectTypeOf(client.listOrders.items).returns.toEqualTypeOf<AsyncGenerator<{ id: string }>>();
}

// Descriptor literals, with and without pagination, satisfy OperationDescriptor.
export const paginatedDescriptor = {
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

export const securedDescriptor = {
  id: 'getOrder',
  method: 'GET',
  path: '/orders/{orderId}',
  params: [{ name: 'orderId', in: 'path' }],
  security: [[{ scheme: 'bearerAuth', kind: 'bearer' }]],
} as const satisfies OperationDescriptor;

type Narrow = OperationContext<'listPets' | 'getPet', '/pets' | '/pets/{id}', 'pets'>;

// A narrowed client narrows ctx.operation to the literal unions.
export function narrowedClientNarrowsTheOperation(client: Client<TestOps, Narrow>): void {
  // `use` narrows the callback ctx; a base (contract-shaped) middleware and a base config
  // stay accepted (contravariance of the callback params).
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

  // The narrowed context stays assignable to the base shape (covariance).
  expectTypeOf<RequestContext<Narrow>>().toExtend<RequestContext>();
  expectTypeOf<ClientConfig>().toExtend<ClientConfig<Narrow>>();
}

// Result discriminates on error: when error is present, data is undefined, and the reverse.
expectTypeOf<
  Extract<Result<string, { title: string }>, { error: { title: string } }>['data']
>().toEqualTypeOf<undefined>();
expectTypeOf<
  Extract<Result<string, { title: string }>, { error: undefined }>['data']
>().toEqualTypeOf<string>();
export const retryOptions: RequestOptions = { retry: { retries: 1 }, parseAs: 'auto' };

// `envelope: true` returns { data, headers, response }; the default stays the body.
export function envelopeTrueReturnsTheEnvelope(client: Client<EnvelopeOps>): void {
  expectTypeOf(client.listCustomers({ params: { limit: 1 } })).resolves.toEqualTypeOf<Customer[]>();
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
}

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

// Result-mode entries ignore `envelope: true` without changing their return type.
export function resultModeIgnoresEnvelope(client: Client<ResultModeOps>): void {
  expectTypeOf(client.listCustomers({}, { envelope: true })).resolves.toEqualTypeOf<
    Result<string[], { title: string }>
  >();
}

// Init objects that never mention envelope keep the plain body.
export function initWithoutEnvelopeKeepsTheBody(client: Client<EnvelopeOps>): void {
  expectTypeOf(client.listCustomers({}, {})).resolves.toEqualTypeOf<Customer[]>();
  expectTypeOf(client.listCustomers({}, { headers: { 'X-Trace': '1' } })).resolves.toEqualTypeOf<
    Customer[]
  >();
  expectTypeOf(
    client.listCustomers({}, { signal: new AbortController().signal, parseAs: 'json' })
  ).resolves.toEqualTypeOf<Customer[]>();
}

// A widened envelope flag returns a union.
export function widenedEnvelopeReturnsAUnion(client: Client<EnvelopeOps>): void {
  const widened = { envelope: true };
  expectTypeOf(client.listCustomers({}, widened)).resolves.toEqualTypeOf<
    Customer[] | Envelope<Customer[], { paginationTotal?: number }>
  >();

  // Exact `RequestOptions` stays the body: package-mode sugar generated before envelope typed
  // every `init` as `RequestOptions`, and widening that would break upgrades that do not
  // regenerate. Narrow with `{ envelope: true }` (or `as const`).
  const annotated: RequestOptions = { envelope: true };
  expectTypeOf(client.listCustomers({}, annotated)).resolves.toEqualTypeOf<Customer[]>();

  // The tanstack queryFn shape: a spread of possibly-envelope options plus signal.
  const spreadCall = (outer?: RequestOptions) =>
    client.listCustomers({}, { ...outer, signal: new AbortController().signal });
  expectTypeOf(spreadCall).returns.resolves.toEqualTypeOf<
    Customer[] | Envelope<Customer[], { paginationTotal?: number }>
  >();

  expectTypeOf(client.listCustomers({}, { envelope: false })).resolves.toEqualTypeOf<Customer[]>();
}

// Exact RequestOptions keeps the plain body (pre-envelope package-mode sugar).
export function exactRequestOptionsKeepsTheBody(client: Client<EnvelopeOps>): void {
  // Mimics flat sugar emitted before envelope: `(init: RequestOptions = {}) => …`.
  const oldSugar = (init: RequestOptions = {}) => client.listCustomers({}, init);

  expectTypeOf(oldSugar).returns.resolves.toEqualTypeOf<Customer[]>();
  expectTypeOf(oldSugar({})).resolves.toEqualTypeOf<Customer[]>();
  expectTypeOf(oldSugar({ headers: { 'X-Trace': '1' } })).resolves.toEqualTypeOf<Customer[]>();
}
