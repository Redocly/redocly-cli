import type { ApiModel, OperationModel } from '../../intermediate-representation/model.js';
import type { EmitOptions } from '../client.js';
import { emitClientSingleFile } from '../package-client.js';
import { ts } from '../ts.js';
import { apiModel, namedSchema, operation, param, response, SCALAR } from './fixtures.js';

function modelWith(ops: OperationModel[], extra: Partial<ApiModel> = {}): ApiModel {
  return apiModel({ services: [{ name: 'Default', operations: ops }], ...extra });
}

/** The package arm of the shared emitter. */
function emit(model: ApiModel, options: EmitOptions = {}): string {
  return emitClientSingleFile(model, { ...options, runtime: 'package' });
}

const getOrder = operation({
  name: 'getOrder',
  path: '/orders/{orderId}',
  pathParams: [param('orderId', 'path', true)],
  queryParams: [param('expand', 'query')],
  successResponses: [response({ schema: { kind: 'ref', name: 'Order' } })],
  errorResponses: [response({ status: 400, schema: { kind: 'ref', name: 'Problem' } })],
  security: [['bearerAuth']],
  tags: ['Orders'],
});
const createPet = operation({
  name: 'createPet',
  method: 'post',
  path: '/pets',
  requestBody: {
    contentType: 'application/json',
    schema: { kind: 'ref', name: 'Pet' },
    required: true,
  },
  successResponses: [response({ schema: { kind: 'ref', name: 'Pet' } })],
});
const upload = operation({
  name: 'upload',
  method: 'post',
  path: '/upload',
  requestBody: {
    contentType: 'multipart/form-data',
    schema: { kind: 'object', properties: [] },
    required: true,
  },
});
const streamEvents = operation({
  name: 'streamEvents',
  path: '/events',
  successResponses: [
    response({ contentType: 'text/event-stream', schema: { kind: 'ref', name: 'OrderEvent' } }),
  ],
});
const configureOp = operation({ name: 'configure', path: '/configure-op' });
const listOrders = operation({
  name: 'listOrders',
  path: '/orders',
  queryParams: [param('cursor', 'query'), param('limit', 'query')],
  successResponses: [response({ schema: { kind: 'ref', name: 'OrderPage' } })],
});
const CURSOR_RULE = {
  style: 'cursor' as const,
  cursorParam: 'cursor',
  nextCursor: '/nextCursor',
  items: '/orders',
};
const ORDER_PAGE = namedSchema('OrderPage', {
  kind: 'object',
  properties: [
    {
      name: 'orders',
      schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
      required: true,
    },
    { name: 'nextCursor', schema: SCALAR, required: false },
  ],
});

const SCHEMAS = [
  namedSchema('Order', { kind: 'object', properties: [] }),
  namedSchema('Problem', { kind: 'object', properties: [] }),
  namedSchema('Pet', { kind: 'object', properties: [] }),
  namedSchema('OrderEvent', { kind: 'object', properties: [] }),
];
const CAFE = modelWith([getOrder, createPet, upload, streamEvents, configureOp], {
  schemas: SCHEMAS,
  securitySchemes: [
    { kind: 'bearer', key: 'bearerAuth' },
    { kind: 'apiKeyCookie', key: 'cookieAuth', cookieName: 'sid' },
  ],
});

describe('emitClientSingleFile (package arm)', () => {
  const output = emit(CAFE, { serverUrl: 'https://x' });

  it('imports from the package instead of inlining the runtime template', () => {
    expect(output).toContain(
      "import { createClient, type OperationDescriptor, type RequestOptions, type SseOptions, type TokenProvider } from '@redocly/client-generator';"
    );
    expect(output).not.toContain('__send');
    expect(output).not.toContain('__buildUrl');
    expect(output).not.toContain('let BASE');
  });

  it('escapes U+2028/U+2029 in generated string literals (code-shape hardening)', () => {
    const out = emit(
      modelWith([getOrder], {
        schemas: SCHEMAS,
        securitySchemes: [{ kind: 'apiKeyHeader', key: 'k\u2028evil', headerName: 'X-K' }],
      }),
      { serverUrl: 'https://x/\u2029path' }
    );
    expect(out).toContain('serverUrl: "https://x/\\u2029path"');
    expect(out).toContain('client.auth.apiKey("k\\u2028evil", value)');
    expect(out).not.toContain('\u2028');
    expect(out).not.toContain('\u2029');
  });

  it('bakes the serverUrl into the createClient config and narrows ctx.operation', () => {
    expect(output).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS, { serverUrl: "https://x" });'
    );
  });

  it('emits schema types, type guards, aliases, Ops, and OPERATIONS', () => {
    expect(output).toContain('export type Order =');
    expect(output).toContain('export type GetOrderResult = Order;');
    expect(output).toContain('export type Ops = {');
    expect(output).toContain('as const satisfies Record<string, OperationDescriptor>;');
  });

  it('emits type guards for discriminated unions', () => {
    const model = modelWith([getOrder], {
      schemas: [
        namedSchema('Cat', {
          kind: 'object',
          properties: [{ name: 'type', schema: { kind: 'literal', value: 'cat' }, required: true }],
        }),
        namedSchema('Dog', {
          kind: 'object',
          properties: [{ name: 'type', schema: { kind: 'literal', value: 'dog' }, required: true }],
        }),
        namedSchema('Animal', {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Cat' },
            { kind: 'ref', name: 'Dog' },
          ],
        }),
        ...SCHEMAS,
      ],
    });
    expect(emit(model)).toContain('export function isCat(');
  });

  it('emits core destructure and auth sugar bound to the instance', () => {
    expect(output).toContain('export const { configure, use } = client;');
    expect(output).toContain('export const setBearer = client.auth.bearer;');
    // Sole apiKey scheme → unsuffixed setter, scheme key baked into the closure.
    expect(output).toContain(
      'export const setApiKey = (value: TokenProvider) => client.auth.apiKey("cookieAuth", value);'
    );
    expect(output).not.toContain('setBasicAuth');
  });

  it('emits flat sugar one-liners forwarding to the grouped client methods', () => {
    // Same positional signature style as inline flat mode (`renderArgList`): inline
    // param object types with `= {}` defaults, trailing `init: … = {}`.
    expect(output).toContain('export const getOrder = (orderId: string, params: {');
    expect(output).toContain('=> client.getOrder({ orderId, params }, init);');
    expect(output).toContain(
      'export const createPet = (body: Pet, init: RequestOptions = {}) => client.createPet({ body }, init);'
    );
    // SSE sugar takes SseOptions and returns the generator directly.
    expect(output).toContain(
      'export const streamEvents = (init: SseOptions = {}) => client.streamEvents({}, init);'
    );
  });

  it('renames the colliding operation everywhere while the core members keep their names', () => {
    expect(output).toContain('configure_2: {');
    expect(output).toContain('id: "configure"'); // descriptor id stays the spec operationId
    expect(output).toContain(
      'export const configure_2 = (init: RequestOptions = {}) => client.configure_2({}, init);'
    );
  });

  it('re-exports the public surface', () => {
    expect(output).toContain("export { ApiError, createClient } from '@redocly/client-generator';");
    expect(output).toContain(
      "export type { ClientConfig, Middleware, RequestOptions, ServerSentEvent, SseOptions } from '@redocly/client-generator';"
    );
  });

  it('keys flat-sugar path values by WIRE name when it differs from the ident', () => {
    const model = modelWith([
      operation({
        name: 'getPet',
        path: '/pets/{pet-id}',
        pathParams: [param('pet-id', 'path', true)],
        successResponses: [response()],
      }),
    ]);
    // No options at all — the emitter's own defaults apply.
    const out = emit(model);
    expect(out).toContain(
      'export const getPet = (pet_id: string, init: RequestOptions = {}) => client.getPet({ "pet-id": pet_id }, init);'
    );
    expect(out).toContain('"pet-id": string;'); // Ops args + Variables alias, wire-keyed
  });

  it('keeps sanitizer-collapsed path params distinct: identifier-safe wire name, renamed ident', () => {
    const model = modelWith([
      operation({
        name: 'compare',
        path: '/x/{a-b}/{a_b}',
        pathParams: [param('a-b', 'path', true), param('a_b', 'path', true)],
        successResponses: [response()],
      }),
    ]);
    // `a-b` sanitizes to `a_b`, so the literal `a_b` param is deduped to `a_b_2` —
    // but both forward under their wire names.
    expect(emit(model)).toContain('client.compare({ "a-b": a_b, a_b: a_b_2 }, init);');
  });

  it('layers a baked setup OVER the spec defaults and imports the contract types', () => {
    const out = emit(modelWith([getOrder], { schemas: SCHEMAS }), {
      serverUrl: 'https://x',
      setup: '{ config: { retry: { retries: 2 } } }',
    });
    expect(out).toContain(
      "import { createClient, mergeSetup, type ClientConfig, type Middleware, type OperationDescriptor, type RequestOptions } from '@redocly/client-generator';"
    );
    expect(out).toContain(
      'const __redoclySetup: { config?: ClientConfig; middleware?: Middleware[] } = { config: { retry: { retries: 2 } } };'
    );
    // Precedence lowest→highest: spec default → baked setup (→ app configure()).
    expect(out).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS, mergeSetup({ config: { serverUrl: "https://x" } }, mergeSetup(__redoclySetup, {})));'
    );
  });

  it('result mode with an SSE-only spec does not import the (unreferenced) Result type', () => {
    const out = emit(modelWith([streamEvents], { schemas: SCHEMAS }), { errorMode: 'result' });
    expect(out).not.toContain('type Result');
    // The SSE member stays unwrapped, and the re-export list still offers Result.
    expect(out).toContain('kind: "sse"');
    expect(out).toContain(
      "export type { ClientConfig, Middleware, RequestOptions, Result, ServerSentEvent, SseOptions } from '@redocly/client-generator';"
    );
  });

  it('bakes errorMode: result into the config and wraps Ops results', () => {
    const out = emit(modelWith([getOrder], { schemas: SCHEMAS }), {
      serverUrl: 'https://x',
      errorMode: 'result',
    });
    expect(out).toContain('{ serverUrl: "https://x", errorMode: "result" }');
    expect(out).toContain('result: Result<GetOrderResult, GetOrderError>;');
    expect(out).toContain('type Result');
  });

  it('grouped argsStyle destructures the client methods instead of flat one-liners', () => {
    const out = emit(CAFE, { serverUrl: 'https://x', argsStyle: 'grouped' });
    expect(out).toContain(
      'export const { getOrder, createPet, upload, streamEvents, configure_2 } = client;'
    );
    expect(out).not.toContain('=> client.getOrder(');
    // No flat sugar → the per-call option types are not imported (only re-exported).
    expect(out).toContain(
      "import { createClient, type OperationDescriptor, type TokenProvider } from '@redocly/client-generator';"
    );
  });

  it('threads one schemaNames set: a suppressed alias is inlined in Ops, never referenced', () => {
    const model = modelWith(
      [
        operation({
          name: 'search',
          path: '/search',
          successResponses: [response({ schema: { kind: 'ref', name: 'SearchResult' } })],
        }),
      ],
      { schemas: [namedSchema('SearchResult', { kind: 'object', properties: [] })] }
    );
    const out = emit(model);
    expect(out).not.toContain('export type SearchResult = SearchResult;');
    expect(out).toContain('result: SearchResult;'); // the schema type, inlined
  });

  it('suffixes apiKey setters when several apiKey schemes exist; emits setBasicAuth for basic', () => {
    const out = emit(
      modelWith([getOrder], {
        schemas: SCHEMAS,
        securitySchemes: [
          { kind: 'basic', key: 'basicAuth' },
          { kind: 'apiKeyHeader', key: 'keyA', headerName: 'X-A' },
          { kind: 'apiKeyQuery', key: 'keyB', paramName: 'b' },
        ],
      })
    );
    expect(out).toContain('export const setBasicAuth = client.auth.basic;');
    expect(out).toContain(
      'export const setApiKeyKeyA = (value: TokenProvider) => client.auth.apiKey("keyA", value);'
    );
    expect(out).toContain(
      'export const setApiKeyKeyB = (value: TokenProvider) => client.auth.apiKey("keyB", value);'
    );
  });

  it('handles a spec with no operations: uniform wiring over empty maps', () => {
    const out = emit(modelWith([]), {});
    expect(out).toContain('export type Ops = Record<string, never>;');
    expect(out).toContain(
      'export const OPERATIONS = {} as const satisfies Record<string, OperationDescriptor>;'
    );
    // model fixture has a serverUrl — still baked.
    expect(out).toContain(
      'export const client = createClient<Ops>(OPERATIONS, { serverUrl: "https://api.example.com" });'
    );
    expect(out).toContain('export const { configure, use } = client;');
  });

  it('emits an empty config object when neither options nor the document set a serverUrl', () => {
    const out = emit(modelWith([getOrder], { serverUrl: undefined, schemas: SCHEMAS }));
    expect(out).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS, {});'
    );
  });

  it('forwards the headers slot for operations with header params', () => {
    const out = emit(
      modelWith([
        operation({
          name: 'ping',
          path: '/ping',
          headerParams: [param('X-Trace', 'header')],
          successResponses: [response()],
        }),
      ])
    );
    expect(out).toContain('=> client.ping({ headers }, init);');
  });

  it('matches the golden output for a small model', () => {
    const model = modelWith([getOrder, streamEvents], {
      schemas: [
        namedSchema('Order', {
          kind: 'object',
          properties: [{ name: 'id', schema: SCALAR, required: true }],
        }),
        ...SCHEMAS.slice(1),
      ],
      securitySchemes: [{ kind: 'bearer', key: 'bearerAuth' }],
    });
    expect(emit(model, { serverUrl: 'https://cafe.example.com' })).toMatchSnapshot();
  });
});

describe('emitClientSingleFile (embed arm)', () => {
  const output = emitClientSingleFile(CAFE, { serverUrl: 'https://x' });

  it('embeds the runtime block instead of importing the package', () => {
    expect(output).toContain('// ─── Embedded runtime');
    expect(output).toContain('export class ApiError');
    expect(output).toContain('export function createClient<\n  Ops extends OpsShape,');
    expect(output).not.toContain("from '@redocly/client-generator'");
  });

  it('emits no re-export section — the embedded surface is already exported in place', () => {
    expect(output).not.toContain('export { ApiError }');
    expect(output).not.toContain('export type {');
    expect(output).toContain('export type ClientConfig'); // from the embedded types.ts
  });

  it('embeds every capability CAFE needs: multipart, auth, and sse', () => {
    expect(output).toContain('function toFormData');
    expect(output).toContain('async function resolveAuth');
    expect(output).toContain('async function* sse');
    expect(output).toContain(
      'createClientCore<Ops, Id, Path, Tag>(operations, config, { serializeMultipart: toFormData, resolveAuth, sse })'
    );
  });

  it('embeds no capability module a plain model does not need', () => {
    const out = emitClientSingleFile(modelWith([createPet], { schemas: SCHEMAS }));
    expect(out).not.toContain('toFormData');
    // The auth MODULE is absent; `resolveAuth` as a bare word still names the
    // (unwired) property in create-client.ts's `Capabilities` seam type.
    expect(out).not.toContain('async function resolveAuth');
    expect(out).not.toContain('async function* sse');
    expect(out).toContain('createClientCore<Ops, Id, Path, Tag>(operations, config, {})');
  });

  it('embeds resolveAuth when a descriptor carries security even without declared schemes', () => {
    const out = emitClientSingleFile(modelWith([getOrder], { schemas: SCHEMAS }));
    expect(out).toContain('async function resolveAuth');
    expect(out).toContain(
      'createClientCore<Ops, Id, Path, Tag>(operations, config, { resolveAuth })'
    );
  });

  it('embeds mergeSetup and bakes the setup const when --setup is given', () => {
    const out = emitClientSingleFile(modelWith([createPet], { schemas: SCHEMAS }), {
      serverUrl: 'https://x',
      setup: '{ config: { retry: { retries: 2 } } }',
    });
    expect(out).toContain('export function mergeSetup');
    expect(out).toContain(
      'const __redoclySetup: { config?: ClientConfig; middleware?: Middleware[] } = { config: { retry: { retries: 2 } } };'
    );
    // Precedence lowest→highest: spec default → baked setup (→ app configure()).
    expect(out).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, string>(OPERATIONS, mergeSetup({ config: { serverUrl: "https://x" } }, mergeSetup(__redoclySetup, {})));'
    );
  });

  it('survives a spec schema named Error: runtime type positions use globalThis.Error', () => {
    const model = modelWith([getOrder], {
      schemas: [
        namedSchema('Error', {
          kind: 'object',
          properties: [{ name: 'code', schema: SCALAR, required: true }],
        }),
        ...SCHEMAS,
      ],
    });
    const out = emitClientSingleFile(model, { serverUrl: 'https://x' });
    // The schema type is emitted alongside the embedded runtime in one module…
    expect(out).toContain('export type Error =');
    // …so every runtime TYPE-position reference to Error must be shadow-proof.
    expect(out).toContain('export type ApiErrorLike = globalThis.Error & {');
    expect(out).toContain('=> globalThis.Error | Promise<globalThis.Error>;');
    expect(out).toContain('let error: globalThis.Error');
    expect(out).toContain('function abortError(signal: AbortSignal): globalThis.Error {');
    // VALUE positions stay bare — `globalThis.Error === Error` at runtime anyway.
    expect(out).toContain('class ApiError extends Error');
    // Cheap semantic gate: the assembled module parses clean.
    const sourceFile = ts.createSourceFile('client.ts', out, ts.ScriptTarget.Latest, true);
    expect((sourceFile as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics).toEqual([]);
  });

  it('emits wiring (Ops → OPERATIONS, client → sugar) byte-identical to the package arm', () => {
    const packaged = emit(CAFE, { serverUrl: 'https://x' });
    // `'export type Ops ='` — the trailing `=` skips the embedded `export type OpsShape`.
    // In embed mode the runtime block sits between OPERATIONS and `client`, so the
    // wiring is compared as its two contiguous segments around it.
    const slice = (out: string, from: string, to: number) => out.slice(out.indexOf(from), to);
    expect(
      slice(output, 'export type Ops =', output.indexOf('// ─── Embedded runtime')).trim()
    ).toBe(slice(packaged, 'export type Ops =', packaged.indexOf('export const client')).trim());
    expect(slice(output, 'export const client', output.length).trim()).toBe(
      slice(packaged, 'export const client', packaged.indexOf('export { ApiError,')).trim()
    );
  });

  it('matches the golden output for a small model', () => {
    const model = modelWith([getOrder, streamEvents], {
      schemas: [
        namedSchema('Order', {
          kind: 'object',
          properties: [{ name: 'id', schema: SCALAR, required: true }],
        }),
        ...SCHEMAS.slice(1),
      ],
      securitySchemes: [{ kind: 'bearer', key: 'bearerAuth' }],
    });
    expect(
      emitClientSingleFile(model, { serverUrl: 'https://cafe.example.com' })
    ).toMatchSnapshot();
  });
});

describe('emitClientSingleFile — pagination', () => {
  const PAGINATED = modelWith([listOrders, getOrder], { schemas: [...SCHEMAS, ORDER_PAGE] });
  const config = { operations: { listOrders: CURSOR_RULE } };

  it('threads a config rule into the descriptor and the Ops item member (package arm)', () => {
    const out = emit(PAGINATED, { pagination: config });
    expect(out).toContain(
      'pagination: { style: "cursor", param: "cursor", nextCursor: "/nextCursor", items: "/orders" }'
    );
    expect(out).toMatch(
      /listOrders: \{\n\s+args: \{\n\s+params\?: ListOrdersParams;\n\s+\};\n\s+result: ListOrdersResult;\n\s+item: Order;\n\s+\};/
    );
  });

  it('resolves the x-pagination extension without any config', () => {
    const model = modelWith([{ ...listOrders, paginationExtension: CURSOR_RULE }, getOrder], {
      schemas: [...SCHEMAS, ORDER_PAGE],
    });
    const out = emit(model);
    expect(out).toContain('item: Order;');
    expect(out).toContain('pagination: { style: "cursor", param: "cursor",');
  });

  it('wraps the flat sugar in Object.assign, preserving .pages/.items', () => {
    const out = emit(PAGINATED, { pagination: config });
    expect(out).toContain('export const listOrders = Object.assign((params: {');
    expect(out).toContain(
      '} = {}, init: RequestOptions = {}) => client.listOrders({ params }, init), { pages: client.listOrders.pages, items: client.listOrders.items });'
    );
    // Non-paginated siblings keep the plain arrow.
    expect(out).toContain('export const getOrder = (orderId: string, params: {');
    expect(out).not.toContain('Object.assign((orderId');
  });

  it('grouped argsStyle needs no wrapper — properties ride along on the destructure', () => {
    const out = emit(PAGINATED, { pagination: config, argsStyle: 'grouped' });
    expect(out).toContain('export const { listOrders, getOrder } = client;');
    expect(out).not.toContain('Object.assign');
  });

  it('embeds the paginate capability in inline mode only when a descriptor paginates', () => {
    // A security-free model, so paginate is the ONLY capability in the factory wiring.
    const model = modelWith([listOrders], { schemas: [SCHEMAS[0], ORDER_PAGE] });
    const paginated = emitClientSingleFile(model, { pagination: config });
    expect(paginated).toContain('async function* pages');
    expect(paginated).toContain(
      'createClientCore<Ops, Id, Path, Tag>(operations, config, { paginate: { pages, items } })'
    );
    const plain = emitClientSingleFile(model);
    expect(plain).not.toContain('async function* pages');
    expect(plain).toContain('createClientCore<Ops, Id, Path, Tag>(operations, config, {})');
  });

  it('throws one aggregated error for explicit rules that do not fit', () => {
    const model = modelWith(
      [
        { ...listOrders, paginationExtension: { ...CURSOR_RULE, cursorParam: 'after' } },
        {
          ...listOrders,
          name: 'listRefunds',
          path: '/refunds',
          paginationExtension: { ...CURSOR_RULE, items: '/refunds' },
        },
      ],
      { schemas: [...SCHEMAS, ORDER_PAGE] }
    );
    expect(() => emitClientSingleFile(model)).toThrow(
      'Invalid pagination configuration:\n' +
        '  - Pagination for operation "listOrders" (x-pagination): ' +
        'query parameter "after" is not declared on the operation\n' +
        '  - Pagination for operation "listRefunds" (x-pagination): ' +
        'the "items" pointer "/refunds" does not resolve in the success response schema'
    );
  });

  it('matches the golden output for a paginated inline client', () => {
    expect(emitClientSingleFile(PAGINATED, { pagination: config })).toMatchSnapshot();
  });

  it('matches the golden output for a paginated package client', () => {
    expect(emit(PAGINATED, { pagination: config })).toMatchSnapshot();
  });

  it('matches the golden output for a result-mode paginated package client', () => {
    // Result mode: the Ops entry gains `page` (the raw page `.pages()` yields) next to
    // the envelope-wrapped `result`.
    expect(emit(PAGINATED, { pagination: config, errorMode: 'result' })).toMatchSnapshot();
  });
});
