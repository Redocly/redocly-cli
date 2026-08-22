import ts from 'typescript';

import {
  modelWith,
  namedSchema,
  operation,
  param,
  response,
  SCALAR,
} from '../../../__tests__/fixtures.js';
import type { ApiModel } from '../../../intermediate-representation/model.js';
import { resolveModelPagination } from '../../../pagination.js';
import type { EmitOptions } from '../../types.js';
import { emitClientSingleFile, emitRuntimeFiles } from '../client-assembly.js';

/**
 * The emitted client with the embedded runtime block cut out, so assertions and the
 * golden snapshots cover the wiring this file OWNS — the runtime bytes are pinned by
 * runtime-sources.test.ts, and full inline output by the e2e cafe snapshot.
 */
function emit(model: ApiModel, options: EmitOptions = {}): string {
  const out = emitClientSingleFile(model, options);
  const start = out.indexOf('// ─── Embedded runtime');
  if (start === -1) return out;
  const setup = out.indexOf('// ─── Baked-in setup', start);
  const end = setup !== -1 ? setup : out.indexOf('export const client =', start);
  return out.slice(0, start) + out.slice(end);
}

const getOrder = operation({
  name: 'getOrder',
  path: '/orders/{orderId}',
  pathParams: [param('orderId', 'path', true)],
  queryParams: [param('expand', 'query', false)],
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
  queryParams: [param('cursor', 'query', false), param('limit', 'query', false)],
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

describe('emitClientSingleFile (wiring)', () => {
  const output = emit(CAFE, { serverUrl: 'https://x' });

  it('escapes U+2028/U+2029 in generated string literals (code-shape hardening)', () => {
    const out = emit(
      modelWith([getOrder], {
        schemas: SCHEMAS,
        securitySchemes: [{ kind: 'apiKeyHeader', key: 'k\u2028evil', headerName: 'X-K' }],
      }),
      { serverUrl: 'https://x/\u2029path' }
    );
    expect(out).toContain('serverUrl: "https://x/\\u2029path"');
    expect(out).not.toContain('\u2028');
    expect(out).not.toContain('\u2029');
  });

  it('bakes the serverUrl into the createClient config and narrows ctx.operation', () => {
    expect(output).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS, { serverUrl: "https://x", clientHeader: "redocly-client-generator" });'
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

  it('exports the core destructure, and no per-scheme credential setters', () => {
    expect(output).toContain('export const { configure, use } = client;');
    // Credentials are set through `configure({ auth })` or `client.auth.*`. A setter per
    // scheme gave the same act a third spelling and a name operations had to avoid.
    expect(output).not.toContain('export const setBearer');
    expect(output).not.toContain('export const setApiKey');
    expect(output).not.toContain('export const setBasicAuth');
    // What tells the runtime which credentials an operation needs is the descriptor.
    expect(output).toContain('security: [[{ scheme: "bearerAuth"');
  });

  it('exports the client methods as bindings — one function per operation, no wrappers', () => {
    // The module-level name IS the method, so importing it and reaching through the
    // instance can never disagree about the arguments.
    expect(output).toContain(
      'export const { getOrder, createPet, upload, streamEvents, configure_2 } = client;'
    );
    expect(output).not.toContain('=> client.getOrder(');
    expect(output).not.toContain('=> client.streamEvents(');
  });

  it('renames the colliding operation everywhere while the core members keep their names', () => {
    expect(output).toContain('configure_2: {');
    expect(output).toContain('id: "configure"'); // descriptor id stays the spec operationId
    // `configure` itself stays the client's own member; the operation rides the binding.
    expect(output).toContain('export const { configure, use } = client;');
    expect(output).toContain('configure_2 } = client;');
  });

  it('keys a path value by its WIRE name, which is what the runtime substitutes', () => {
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
    expect(out).toContain('export type GetPetPath = {\n    "pet-id": string;\n};');
    expect(out).toContain('path: GetPetPath;');
    expect(out).not.toContain('pet_id');
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
    // Two wire names that sanitize alike stay distinct, because the layer keys them by
    // wire name and never derives a binding identifier.
    expect(emit(model)).toContain(
      'export type ComparePath = {\n    "a-b": string;\n    a_b: string;\n};'
    );
  });

  it('layers a baked setup OVER the spec defaults', () => {
    const out = emit(modelWith([getOrder], { schemas: SCHEMAS }), {
      serverUrl: 'https://x',
      setup: '{ config: { retry: { retries: 2 } } }',
    });
    expect(out).toContain(
      'const __redoclySetup: { config?: ClientConfig; middleware?: Middleware[] } = { config: { retry: { retries: 2 } } };'
    );
    // Precedence lowest→highest: spec default → baked setup (→ app configure()).
    expect(out).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS, mergeSetup({ config: { serverUrl: "https://x", clientHeader: "redocly-client-generator" } }, mergeSetup(__redoclySetup, {})));'
    );
  });

  it('result mode with an SSE-only spec keeps the SSE member unwrapped', () => {
    const out = emit(modelWith([streamEvents], { schemas: SCHEMAS }), { errorMode: 'result' });
    expect(out).toContain('kind: "sse"');
    expect(out).not.toContain('result: Result<');
  });

  it('bakes errorMode: result into the config and wraps Ops results', () => {
    const out = emit(modelWith([getOrder], { schemas: SCHEMAS }), {
      serverUrl: 'https://x',
      errorMode: 'result',
    });
    expect(out).toContain(
      '{ serverUrl: "https://x", errorMode: "result", clientHeader: "redocly-client-generator" }'
    );
    expect(out).toContain('result: Result<GetOrderResult, GetOrderError>;');
  });

  it('argsStyle: flat merges the inputs and tells the runtime, keeping one binding', () => {
    const out = emit(CAFE, { serverUrl: 'https://x', argsStyle: 'flat' });
    expect(out).toContain(
      'export const { getOrder, createPet, upload, streamEvents, configure_2 } = client;'
    );
    expect(out).toContain('argsStyle: "flat"');
    // Merged: the path param sits beside the query params, with no layer keys.
    expect(out).toContain('export type GetOrderVariables = {');
    expect(out).not.toContain('path: GetOrderPath;');
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

  it('handles a spec with no operations: uniform wiring over empty maps', () => {
    const out = emit(modelWith([]), {});
    expect(out).toContain('export type Ops = Record<string, never>;');
    expect(out).toContain(
      'export const OPERATIONS = {} as const satisfies Record<string, OperationDescriptor>;'
    );
    // model fixture has a serverUrl — still baked.
    expect(out).toContain(
      'export const client = createClient<Ops>(OPERATIONS, { serverUrl: "https://api.example.com", clientHeader: "redocly-client-generator" });'
    );
    expect(out).toContain('export const { configure, use } = client;');
  });

  it('emits an empty config object when neither options nor the document set a serverUrl', () => {
    const out = emit(modelWith([getOrder], { serverUrl: undefined, schemas: SCHEMAS }));
    expect(out).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS, { clientHeader: "redocly-client-generator" });'
    );
  });

  it('forwards the headers slot for operations with header params', () => {
    const out = emit(
      modelWith([
        operation({
          name: 'ping',
          path: '/ping',
          headerParams: [param('X-Trace', 'header', false)],
          successResponses: [response()],
        }),
      ])
    );
    expect(out).toContain('export type PingHeaders = {\n    "X-Trace"?: string;\n};');
    expect(out).toContain('headers?: PingHeaders;');
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

describe('emitClientSingleFile (embedded runtime)', () => {
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
      'export const client = createClient<Ops, OperationId, OperationPath, string>(OPERATIONS, mergeSetup({ config: { serverUrl: "https://x", clientHeader: "redocly-client-generator" } }, mergeSetup(__redoclySetup, {})));'
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

  // The full inline output is not snapshotted here: the runtime bytes are pinned by
  // runtime-sources.test.ts, the wiring by the trimmed snapshots above, and a real
  // full inline client by the e2e cafe.snapshot.ts.
});

describe('runtime: module', () => {
  it('writes the per-needs modules + the factory, and the entry imports them relatively', () => {
    const files = emitRuntimeFiles(CAFE, { runtime: 'module' });
    // CAFE needs multipart, auth, and sse — no setup, no pagination.
    expect(files.map((file) => file.name)).toEqual([
      'types.ts',
      'errors.ts',
      'url.ts',
      'parse.ts',
      'retry.ts',
      'multipart.ts',
      'auth.ts',
      'send.ts',
      'sse.ts',
      'create-client.ts',
      'factory.ts',
    ]);
    const factory = files.find((file) => file.name === 'factory.ts')!.content;
    expect(factory).toContain("import { createClientCore } from './create-client.js';");
    expect(factory).toContain("import { toFormData } from './multipart.js';");
    expect(factory).toContain("import { resolveAuth } from './auth.js';");
    expect(factory).toContain("import { sse } from './sse.js';");
    expect(factory).not.toContain("from './paginate.js'");
    expect(factory).toContain("export { ApiError, TimeoutError } from './errors.js';");
    expect(factory).toContain("export type * from './types.js';");
    // The raw modules keep their imports — nothing is stripped in module mode.
    const send = files.find((file) => file.name === 'send.ts')!.content;
    expect(send).toContain("from './errors.js'");

    const entry = emitClientSingleFile(CAFE, { runtime: 'module' });
    expect(entry).toContain("import { createClient } from './runtime/factory.js';");
    expect(entry).toContain("import type { OperationDescriptor } from './runtime/types.js';");
    expect(entry).toContain("export * from './runtime/factory.js';");
    expect(entry).not.toContain('// ─── Embedded runtime');
  });

  it('inline mode writes no runtime files', () => {
    expect(emitRuntimeFiles(CAFE, {})).toEqual([]);
  });

  it('importExt ts rewrites the intra-runtime specifiers so Node can strip types directly', () => {
    const files = emitRuntimeFiles(CAFE, { runtime: 'module', importExt: 'ts' });
    const factory = files.find((file) => file.name === 'factory.ts')!.content;
    expect(factory).toContain("import { createClientCore } from './create-client.ts';");
    expect(factory).not.toContain(".js'");
    const entry = emitClientSingleFile(CAFE, { runtime: 'module', importExt: 'ts' });
    expect(entry).toContain("import { createClient } from './runtime/factory.ts';");
  });

  it('a baked setup imports mergeSetup and the config types from the runtime', () => {
    const entry = emitClientSingleFile(CAFE, { runtime: 'module', setup: '{}' });
    expect(entry).toContain("import { createClient, mergeSetup } from './runtime/factory.js';");
    expect(entry).toContain('ClientConfig');
    const files = emitRuntimeFiles(CAFE, { runtime: 'module', setup: '{}' });
    expect(files.find((file) => file.name === 'setup.ts')).toBeDefined();
    expect(files.find((file) => file.name === 'factory.ts')!.content).toContain(
      "export { mergeSetup } from './setup.js';"
    );
  });
});

describe('emitClientSingleFile — pagination', () => {
  const PAGINATED = modelWith([listOrders, getOrder], { schemas: [...SCHEMAS, ORDER_PAGE] });
  const config = { operations: { listOrders: CURSOR_RULE } };
  const pagination = resolveModelPagination(PAGINATED, config);

  it('threads a config rule into the descriptor and the Ops item member', () => {
    const out = emit(PAGINATED, { pagination });
    expect(out).toContain(
      'pagination: { style: "cursor", param: "cursor", nextCursor: "/nextCursor", items: "/orders" }'
    );
    expect(out).toMatch(
      /listOrders: \{\n\s+args: \{\n\s+query\?: ListOrdersQuery;\n\s+\};\n\s+result: ListOrdersResult;\n\s+item: Order;\n\s+\};/
    );
  });

  it('resolves the x-redoclyPagination extension without any config', () => {
    const model = modelWith([{ ...listOrders, paginationExtension: CURSOR_RULE }, getOrder], {
      schemas: [...SCHEMAS, ORDER_PAGE],
    });
    const out = emit(model, { pagination: resolveModelPagination(model, undefined) });
    expect(out).toContain('item: Order;');
    expect(out).toContain('pagination: { style: "cursor", param: "cursor",');
  });

  it('the iterators ride the binding, so `.pages`/`.items` need no wrapper', () => {
    const out = emit(PAGINATED, { pagination });
    // `listOrders` is the client method itself, which carries `.pages`/`.items` — there is
    // nothing to re-wrap, and therefore no second argument shape to get wrong.
    expect(out).toContain('export const { listOrders, getOrder } = client;');
    expect(out).not.toContain('Object.assign(');
    expect(out).toContain('item: Order;');
  });

  it('grouped argsStyle needs no wrapper — properties ride along on the destructure', () => {
    const out = emit(PAGINATED, { pagination, argsStyle: 'grouped' });
    expect(out).toContain('export const { listOrders, getOrder } = client;');
    expect(out).not.toContain('Object.assign');
  });

  it('embeds the paginate capability in inline mode only when a descriptor paginates', () => {
    // A security-free model, so paginate is the ONLY capability in the factory wiring.
    const model = modelWith([listOrders], { schemas: [SCHEMAS[0], ORDER_PAGE] });
    const paginated = emitClientSingleFile(model, {
      pagination: resolveModelPagination(model, config),
    });
    expect(paginated).toContain('async function* pages');
    expect(paginated).toContain(
      'createClientCore<Ops, Id, Path, Tag>(operations, config, { paginate: { pages, items, pagesByLink, itemsByLink } })'
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
    expect(() => resolveModelPagination(model, undefined)).toThrow(
      'Invalid pagination configuration:\n' +
        '  - Pagination for operation "listOrders" (x-redoclyPagination): ' +
        'query parameter "after" is not declared on the operation (declared: cursor, limit)\n' +
        '  - Pagination for operation "listRefunds" (x-redoclyPagination): ' +
        'the "items" pointer "/refunds" does not resolve in the success response schema'
    );
  });

  it('matches the golden output for a paginated client (wiring only)', () => {
    expect(emit(PAGINATED, { pagination })).toMatchSnapshot();
  });

  it('matches the golden output for a result-mode paginated client (wiring only)', () => {
    // Result mode: the Ops entry gains `page` (the raw page `.pages()` yields) next to
    // the envelope-wrapped `result`.
    expect(emit(PAGINATED, { pagination, errorMode: 'result' })).toMatchSnapshot();
  });
});
