import type {
  ApiModel,
  OperationModel,
  ResponseBodyModel,
} from '../../intermediate-representation/model.js';
import { descriptorStatements, opsInterfaceStatements, packageIdents } from '../descriptor.js';
import type { EmitContext } from '../operations.js';
import type { ModelPagination } from '../pagination.js';
import { printStatements } from '../ts.js';
import { apiModel, operation, param } from './fixtures.js';

function op(name: string, extra: Partial<OperationModel> = {}): OperationModel {
  return operation({ name, ...extra });
}

function modelWith(ops: OperationModel[], extra: Partial<ApiModel> = {}): ApiModel {
  return apiModel({ services: [{ name: 'Default', operations: ops }], ...extra });
}

function emitDescriptors(model: ApiModel): string {
  return printStatements(descriptorStatements(model, packageIdents(model), 'string'));
}

/** A JSON 200 response — keeps `responseKind` at its omitted `'json'` default. */
const JSON_OK: ResponseBodyModel = {
  contentType: 'application/json',
  schema: { kind: 'ref', name: 'Pong' },
  status: 200,
};

describe('packageIdents', () => {
  it('renames colliding operation ids deterministically', () => {
    const model = modelWith([op('configure'), op('createClient'), op('setBearer')], {
      securitySchemes: [{ kind: 'bearer', key: 'bearerAuth' }],
    });
    const idents = packageIdents(model);
    expect(idents.get('configure')).toBe('configure_2');
    expect(idents.get('createClient')).toBe('createClient_2');
    expect(idents.get('setBearer')).toBe('setBearer_2'); // auth sugar seeded first
  });

  it('keeps non-colliding names and sanitizes non-identifier ones', () => {
    const idents = packageIdents(modelWith([op('ping'), op('get-thing')]));
    expect(idents.get('ping')).toBe('ping');
    expect(idents.get('get-thing')).toBe('get_thing');
  });

  it('reserves the TokenProvider import and the __redoclySetup const', () => {
    const idents = packageIdents(modelWith([op('TokenProvider'), op('__redoclySetup')]));
    expect(idents.get('TokenProvider')).toBe('TokenProvider_2');
    expect(idents.get('__redoclySetup')).toBe('__redoclySetup_2');
  });
});

describe('descriptorStatements', () => {
  it('returns no statements for a model with no operations', () => {
    expect(descriptorStatements(apiModel(), new Map(), 'string')).toEqual([]);
  });

  it('emits a minimal descriptor with only the non-default fields', () => {
    const out = emitDescriptors(
      modelWith([op('ping', { path: '/ping', successResponses: [JSON_OK] })])
    );
    expect(out).toContain('ping: { id: "ping", method: "GET", path: "/ping" }');
    expect(out).toContain('as const satisfies Record<string, OperationDescriptor>;');
    expect(out).not.toContain('tags:');
    expect(out).not.toContain('params:');
    expect(out).not.toContain('responseKind:');
  });

  it('matches the full minimal output', () => {
    expect(emitDescriptors(modelWith([op('ping', { path: '/ping', successResponses: [JSON_OK] })])))
      .toMatchInlineSnapshot(`
        "/**
         * The wire-shape descriptor for every operation, keyed by operationId — the data the
         * runtime routes requests by. Also minification-safe static metadata (method, path,
         * tags) for cache keys, tracing span names, and request logging.
         */
        export const OPERATIONS = {
            ping: { id: "ping", method: "GET", path: "/ping" }
        } as const satisfies Record<string, OperationDescriptor>;

        export type OperationId = keyof typeof OPERATIONS;

        export type OperationPath = (typeof OPERATIONS)[OperationId]["path"];"
      `);
  });

  it('keys a renamed operation by its emitted identifier but ids it by the spec operationId', () => {
    // `id` drives middleware targeting (`ctx.operation.id`), so it stays the spec's
    // operationId — matching inline mode's `operationMetaExpr` — even when the key is renamed.
    const out = emitDescriptors(
      modelWith([op('configure', { path: '/c', successResponses: [JSON_OK] })])
    );
    expect(out).toContain('configure_2: { id: "configure", method: "GET", path: "/c" }');
  });

  it('keeps id/params/security intact on a renamed operation', () => {
    const out = emitDescriptors(
      modelWith(
        [
          op('use', {
            path: '/u/{id}',
            pathParams: [param('id', 'path', true)],
            security: [['bearerAuth']],
            successResponses: [JSON_OK],
          }),
        ],
        { securitySchemes: [{ kind: 'bearer', key: 'bearerAuth' }] }
      )
    );
    expect(out).toContain(
      'use_2: { id: "use", method: "GET", path: "/u/{id}", params: [{ name: "id", in: "path" }], security: [[{ scheme: "bearerAuth", kind: "bearer" }]] }'
    );
  });

  it('records a non-identifier path param by its quoted wire name', () => {
    const out = emitDescriptors(
      modelWith([
        op('getPet', {
          path: '/pets/{pet-id}',
          pathParams: [param('pet-id', 'path', true)],
          successResponses: [JSON_OK],
        }),
      ])
    );
    expect(out).toContain('params: [{ name: "pet-id", in: "path" }]');
    expect(out).not.toContain('pet_id');
  });

  it('emits params with in/style/explode/allowReserved only when present', () => {
    const out = emitDescriptors(
      modelWith([
        op('getOrder', {
          path: '/orders/{orderId}',
          pathParams: [param('orderId', 'path', true)],
          queryParams: [
            { ...param('tags', 'query'), style: 'pipeDelimited', explode: false },
            { ...param('q', 'query'), allowReserved: true },
            param('limit', 'query'),
          ],
          headerParams: [param('X-Trace', 'header')],
        }),
      ])
    );
    expect(out).toContain('{ name: "orderId", in: "path" }');
    expect(out).toContain('{ name: "tags", in: "query", style: "pipeDelimited", explode: false }');
    expect(out).toContain('{ name: "q", in: "query", allowReserved: true }');
    expect(out).toContain('{ name: "limit", in: "query" }');
    expect(out).toContain('{ name: "X-Trace", in: "header" }');
  });

  it('derives body.multipart, responseKind, and sseDataKind', () => {
    const multipart = emitDescriptors(
      modelWith([
        op('upload', {
          method: 'post',
          requestBody: {
            contentType: 'multipart/form-data',
            required: true,
            schema: { kind: 'object', properties: [] },
          },
        }),
      ])
    );
    expect(multipart).toContain('body: { contentType: "multipart/form-data", multipart: true }');

    const json = emitDescriptors(
      modelWith([
        op('create', {
          method: 'post',
          requestBody: {
            contentType: 'application/json',
            required: true,
            schema: { kind: 'ref', name: 'Pet' },
          },
          successResponses: [
            { contentType: 'application/json', schema: { kind: 'ref', name: 'Pet' }, status: 200 },
          ],
        }),
      ])
    );
    expect(json).toContain('body: { contentType: "application/json" }');
    expect(json).not.toContain('multipart');
    expect(json).not.toContain('responseKind'); // json is the default

    const text = emitDescriptors(
      modelWith([
        op('readme', {
          successResponses: [
            {
              contentType: 'text/plain',
              schema: { kind: 'scalar', scalar: 'string' },
              status: 200,
            },
          ],
        }),
      ])
    );
    expect(text).toContain('responseKind: "text"');

    const none = emitDescriptors(modelWith([op('drop', { method: 'delete' })]));
    expect(none).toContain('responseKind: "void"');

    const blob = emitDescriptors(
      modelWith([
        op('getPhoto', {
          successResponses: [
            { contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 },
          ],
        }),
      ])
    );
    expect(blob).toContain('responseKind: "blob"');

    const sse = emitDescriptors(
      modelWith([
        op('streamEvents', {
          successResponses: [
            {
              contentType: 'text/event-stream',
              schema: { kind: 'object', properties: [] },
              status: 200,
            },
          ],
        }),
      ])
    );
    expect(sse).toContain('responseKind: "sse"');
    expect(sse).toContain('sseDataKind: "json"');
  });

  it('denormalizes security from the model schemes, skipping unknown keys', () => {
    const out = emitDescriptors(
      modelWith([op('getOrder', { security: [['bearerAuth', 'apiCookie', 'ghost']] })], {
        securitySchemes: [
          { kind: 'bearer', key: 'bearerAuth' },
          { kind: 'apiKeyCookie', key: 'apiCookie', cookieName: 'sid' },
        ],
      })
    );
    expect(out).toContain(
      'security: [[{ scheme: "bearerAuth", kind: "bearer" }, { scheme: "apiCookie", kind: "apiKey", name: "sid", in: "cookie" }]]'
    );
    expect(out).not.toContain('ghost');
  });

  it('covers basic, apiKey header, and apiKey query schemes', () => {
    const out = emitDescriptors(
      modelWith([op('getOrder', { security: [['basicAuth', 'apiHeader', 'apiQuery']] })], {
        securitySchemes: [
          { kind: 'basic', key: 'basicAuth' },
          { kind: 'apiKeyHeader', key: 'apiHeader', headerName: 'X-Key' },
          { kind: 'apiKeyQuery', key: 'apiQuery', paramName: 'api_key' },
        ],
      })
    );
    expect(out).toContain('{ scheme: "basicAuth", kind: "basic" }');
    expect(out).toContain('{ scheme: "apiHeader", kind: "apiKey", name: "X-Key", in: "header" }');
    expect(out).toContain('{ scheme: "apiQuery", kind: "apiKey", name: "api_key", in: "query" }');
  });

  it('emits tags and the derived OperationId/OperationPath/OperationTag unions', () => {
    const out = emitDescriptors(
      modelWith([op('listPets', { path: '/pets', tags: ['Pets'] }), op('ping', { path: '/ping' })])
    );
    expect(out).toContain('tags: ["Pets"]');
    expect(out).toContain('export type OperationId = keyof typeof OPERATIONS;');
    expect(out).toContain('export type OperationPath = (typeof OPERATIONS)[OperationId]["path"];');
    // `tags` is present only on tagged entries, so the union is derived via Extract —
    // a plain ["tags"] index would not compile against the untagged entries.
    expect(out).toContain(
      'export type OperationTag = Extract<(typeof OPERATIONS)[OperationId], {\n' +
        '    tags: readonly string[];\n' +
        '}>["tags"][number];'
    );
  });

  it('omits OperationTag when no operation has a tag (avoids never)', () => {
    const out = emitDescriptors(modelWith([op('ping')]));
    expect(out).toContain('export type OperationId');
    expect(out).toContain('export type OperationPath');
    expect(out).not.toContain('OperationTag');
  });

  it('emits the resolved pagination spec with stable key order, only on resolved ops', () => {
    const model = modelWith([
      op('listOrders', {
        path: '/orders',
        queryParams: [param('cursor', 'query')],
        successResponses: [JSON_OK],
      }),
      op('ping', { path: '/ping', successResponses: [JSON_OK] }),
    ]);
    const pagination: ModelPagination = new Map([
      [
        'listOrders',
        {
          spec: {
            style: 'cursor',
            param: 'cursor',
            limitParam: 'limit',
            nextCursor: '/nextCursor',
            items: '/orders',
          },
          itemSchema: { kind: 'ref', name: 'Order' },
        },
      ],
    ]);
    const out = printStatements(
      descriptorStatements(model, packageIdents(model), 'string', pagination)
    );
    expect(out).toContain(
      'pagination: { style: "cursor", param: "cursor", limitParam: "limit", nextCursor: "/nextCursor", items: "/orders" }'
    );
    // Non-paginated entries carry no pagination field.
    expect(out).toContain('ping: { id: "ping", method: "GET", path: "/ping" }');
  });
});

describe('opsInterfaceStatements', () => {
  function emitOps(model: ApiModel, extra: Partial<EmitContext> = {}): string {
    const ctx: EmitContext = {
      argsStyle: 'flat',
      errorMode: 'throw',
      dateType: 'string',
      queryAuthKeys: new Set(),
      schemaNames: new Set(),
      ...extra,
    };
    return printStatements(opsInterfaceStatements(model, packageIdents(model), ctx));
  }

  const getOrder = op('getOrder', {
    path: '/orders/{orderId}',
    pathParams: [param('orderId', 'path', true)],
    successResponses: [
      { contentType: 'application/json', schema: { kind: 'ref', name: 'Order' }, status: 200 },
    ],
  });
  const streamOrders = op('streamOrders', {
    path: '/orders/stream',
    successResponses: [
      {
        contentType: 'text/event-stream',
        schema: { kind: 'ref', name: 'OrderEvent' },
        status: 200,
      },
    ],
  });

  it('returns no statements for a model with no operations', () => {
    expect(emitOps(modelWith([]))).toBe('');
  });

  it('emits per-operation args (via the Variables shape) and result members', () => {
    const out = emitOps(
      modelWith([
        op('getOrder', {
          path: '/orders/{orderId}',
          pathParams: [param('orderId', 'path', true)],
          queryParams: [param('include', 'query')],
          successResponses: [
            {
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
              status: 200,
            },
          ],
        }),
      ])
    );
    expect(out).toContain('export type Ops = {');
    expect(out).toMatch(
      /getOrder: \{\n {8}args: \{\n {12}orderId: string;\n {12}params\?: GetOrderParams;\n {8}\};\n {8}result: GetOrderResult;\n {4}\};/
    );
    expect(out).not.toContain('kind: "sse"');
  });

  it('keys args path params by wire name, quoted when not identifier-safe', () => {
    // The runtime routes path values by wire name (`splitArgs` reads `args[param.name]`),
    // so the args type must key them the same way — never by the sanitized ident.
    const out = emitOps(
      modelWith([
        op('getPet', {
          path: '/pets/{pet-id}',
          pathParams: [param('pet-id', 'path', true)],
        }),
      ])
    );
    expect(out).toContain('"pet-id": string;');
    expect(out).not.toContain('pet_id');
  });

  it('keeps path params that sanitize to the same ident distinct via their wire names', () => {
    const out = emitOps(
      modelWith([
        op('compare', {
          path: '/x/{a-b}/{a.b}',
          pathParams: [param('a-b', 'path', true), param('a.b', 'path', true)],
        }),
      ])
    );
    expect(out).toContain('"a-b": string;');
    expect(out).toContain('"a.b": string;');
    expect(out).not.toContain('a_b');
  });

  it('emits args: {} for a no-input operation', () => {
    const out = emitOps(modelWith([op('ping')]));
    expect(out).toContain('ping: {\n        args: {};');
    expect(out).toContain('result: PingResult;');
  });

  it('inlines the response type when the <Op>Result alias collides with a schema', () => {
    const out = emitOps(modelWith([getOrder]), { schemaNames: new Set(['GetOrderResult']) });
    expect(out).toContain('result: Order;');
    expect(out).not.toContain('GetOrderResult');
  });

  it('keys members by the collision-renamed identifier', () => {
    const out = emitOps(modelWith([op('configure')]));
    expect(out).toContain('configure_2: {');
  });

  it('wraps the result in Result<…, <Op>Error> in result mode', () => {
    const out = emitOps(
      modelWith([
        op('getOrder', {
          ...getOrder,
          errorResponses: [
            {
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Problem' },
              status: 404,
            },
          ],
        }),
      ]),
      { errorMode: 'result' }
    );
    expect(out).toContain('result: Result<GetOrderResult, GetOrderError>;');
  });

  it('falls back to unknown in result mode when the op declares no error responses', () => {
    const out = emitOps(modelWith([getOrder]), { errorMode: 'result' });
    expect(out).toContain('result: Result<GetOrderResult, unknown>;');
  });

  it('inlines the error type when the <Op>Error alias collides with a schema', () => {
    const errored = (errorResponses: OperationModel['errorResponses']) =>
      op('getOrder', { ...getOrder, errorResponses });
    const single = emitOps(
      modelWith([
        errored([
          { contentType: 'application/json', schema: { kind: 'ref', name: 'E1' }, status: 400 },
        ]),
      ]),
      { errorMode: 'result', schemaNames: new Set(['GetOrderError']) }
    );
    expect(single).toContain('result: Result<GetOrderResult, E1>;');

    const union = emitOps(
      modelWith([
        errored([
          { contentType: 'application/json', schema: { kind: 'ref', name: 'E1' }, status: 400 },
          { contentType: 'application/json', schema: { kind: 'ref', name: 'E2' }, status: 500 },
        ]),
      ]),
      { errorMode: 'result', schemaNames: new Set(['GetOrderError']) }
    );
    expect(union).toContain('result: Result<GetOrderResult, E1 | E2>;');
  });

  it('types an SSE op with the event payload and kind: "sse", never a Result wrapper', () => {
    const out = emitOps(modelWith([streamOrders]), { errorMode: 'result' });
    expect(out).toMatch(
      /streamOrders: \{\n {8}args: \{\};\n {8}result: OrderEvent;\n {8}kind: "sse";\n {4}\};/
    );
    expect(out).not.toContain('Result<');
  });

  it('adds an item member (the page element type) only to paginated operations', () => {
    const listOrders = op('listOrders', {
      path: '/orders',
      queryParams: [param('cursor', 'query')],
      successResponses: [
        {
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'OrderPage' },
          status: 200,
        },
      ],
    });
    const pagination: ModelPagination = new Map([
      [
        'listOrders',
        {
          spec: { style: 'cursor', param: 'cursor', nextCursor: '/nextCursor', items: '/orders' },
          itemSchema: { kind: 'ref', name: 'Order' },
        },
      ],
    ]);
    const out = emitOps(modelWith([listOrders, getOrder]), { pagination });
    expect(out).toMatch(
      /listOrders: \{\n {8}args: \{\n {12}params\?: ListOrdersParams;\n {8}\};\n {8}result: ListOrdersResult;\n {8}item: Order;\n {4}\};/
    );
    // The non-paginated sibling stays untouched.
    expect(out).toMatch(
      /getOrder: \{\n {8}args: \{\n {12}orderId: string;\n {8}\};\n {8}result: GetOrderResult;\n {4}\};/
    );
  });

  it('adds a page member (the RAW page type) to paginated operations in result mode only', () => {
    const listOrders = op('listOrders', {
      path: '/orders',
      queryParams: [param('cursor', 'query')],
      successResponses: [
        {
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'OrderPage' },
          status: 200,
        },
      ],
    });
    const pagination: ModelPagination = new Map([
      [
        'listOrders',
        {
          spec: { style: 'cursor', param: 'cursor', nextCursor: '/nextCursor', items: '/orders' },
          itemSchema: { kind: 'ref', name: 'Order' },
        },
      ],
    ]);
    // Result mode: `result` is the envelope, so `page` carries the raw page for `.pages()`.
    const out = emitOps(modelWith([listOrders]), { pagination, errorMode: 'result' });
    expect(out).toMatch(
      /listOrders: \{\n {8}args: \{\n {12}params\?: ListOrdersParams;\n {8}\};\n {8}result: Result<ListOrdersResult, unknown>;\n {8}item: Order;\n {8}page: ListOrdersResult;\n {4}\};/
    );
    // Throw mode emits no page member — `result` already IS the raw page.
    expect(emitOps(modelWith([listOrders]), { pagination })).not.toContain('page:');
    // The page member reuses the suppression-aware alias reference: a colliding
    // `<Op>Result` alias inlines the raw response type instead.
    const suppressed = emitOps(modelWith([listOrders]), {
      pagination,
      errorMode: 'result',
      schemaNames: new Set(['ListOrdersResult']),
    });
    expect(suppressed).toContain('result: Result<OrderPage, unknown>;');
    expect(suppressed).toContain('page: OrderPage;');
  });

  it('types item with the shared dateType handling', () => {
    const listOrders = op('listOrders', {
      path: '/orders',
      queryParams: [param('page', 'query')],
      successResponses: [JSON_OK],
    });
    const pagination: ModelPagination = new Map([
      [
        'listOrders',
        {
          spec: { style: 'page', param: 'page', items: '/orders' },
          itemSchema: {
            kind: 'scalar',
            scalar: 'string',
            metadata: { format: 'date-time' },
          },
        },
      ],
    ]);
    const out = emitOps(modelWith([listOrders]), { pagination, dateType: 'Date' });
    expect(out).toContain('item: Date;');
  });
});
