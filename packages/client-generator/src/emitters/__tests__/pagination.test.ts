import type {
  ApiModel,
  OperationModel,
  SchemaModel,
} from '../../intermediate-representation/model.js';
import {
  type PaginationRule,
  resolveModelPagination,
  resolveOperationPagination,
  resolveSchemaPointer,
} from '../pagination.js';
import { apiModel, namedSchema, operation, param, response, SCALAR } from './fixtures.js';

const ORDER: SchemaModel = {
  kind: 'object',
  properties: [{ name: 'id', schema: SCALAR, required: true }],
};
const ORDER_LIST: SchemaModel = { kind: 'array', items: { kind: 'ref', name: 'Order' } };
/** A cursor page: `{ orders: Order[]; nextCursor?: string }`. */
const ORDER_PAGE: SchemaModel = {
  kind: 'object',
  properties: [
    { name: 'orders', schema: ORDER_LIST, required: true },
    { name: 'nextCursor', schema: SCALAR, required: false },
  ],
};

function modelWith(ops: OperationModel[], extra: Partial<ApiModel> = {}): ApiModel {
  return apiModel({
    services: [{ name: 'Default', operations: ops }],
    schemas: [namedSchema('Order', ORDER), namedSchema('OrderPage', ORDER_PAGE)],
    ...extra,
  });
}

/** `GET /orders` returning an `OrderPage` ref, with the standard advance/limit params. */
function listOrders(extra: Partial<OperationModel> = {}): OperationModel {
  return operation({
    name: 'listOrders',
    path: '/orders',
    queryParams: [
      param('cursor', 'query', false),
      param('offset', 'query', false, { kind: 'scalar', scalar: 'integer' }),
      param('page', 'query', false, { kind: 'scalar', scalar: 'number' }),
      param('limit', 'query', false),
    ],
    successResponses: [response({ schema: { kind: 'ref', name: 'OrderPage' } })],
    ...extra,
  });
}

const CURSOR_RULE: PaginationRule = {
  style: 'cursor',
  cursorParam: 'cursor',
  nextCursor: '/nextCursor',
  items: '/orders',
};
const OFFSET_RULE: PaginationRule = { style: 'offset', offsetParam: 'offset', items: '/orders' };
const PAGE_RULE: PaginationRule = { style: 'page', offsetParam: 'page', items: '/orders' };

describe('resolveSchemaPointer', () => {
  const model = modelWith([]);

  it('returns the (dereferenced) schema itself for the empty pointer', () => {
    expect(resolveSchemaPointer({ kind: 'ref', name: 'Order' }, '', model)).toBe(ORDER);
  });

  it('returns undefined for a pointer that does not start with "/"', () => {
    expect(resolveSchemaPointer(ORDER_PAGE, 'orders', model)).toBeUndefined();
  });

  it('walks object properties by name, resolving refs at each step', () => {
    const root: SchemaModel = {
      kind: 'object',
      properties: [{ name: 'data', schema: { kind: 'ref', name: 'OrderPage' }, required: true }],
    };
    expect(resolveSchemaPointer(root, '/data/orders', model)).toBe(ORDER_LIST);
  });

  it('returns undefined for a missing property', () => {
    expect(resolveSchemaPointer(ORDER_PAGE, '/missing', model)).toBeUndefined();
  });

  it('steps into a record value for any token', () => {
    const root: SchemaModel = { kind: 'record', value: { kind: 'ref', name: 'Order' } };
    expect(resolveSchemaPointer(root, '/anything', model)).toBe(ORDER);
  });

  it('steps into array items only for a numeric token', () => {
    expect(resolveSchemaPointer(ORDER_LIST, '/0', model)).toBe(ORDER);
    expect(resolveSchemaPointer(ORDER_LIST, '/12', model)).toBe(ORDER);
    expect(resolveSchemaPointer(ORDER_LIST, '/first', model)).toBeUndefined();
    expect(resolveSchemaPointer(ORDER_LIST, '/01', model)).toBeUndefined();
  });

  it('bails on unions and intersections (v1 is strict)', () => {
    const union: SchemaModel = { kind: 'union', members: [ORDER_PAGE, { kind: 'null' }] };
    expect(resolveSchemaPointer(union, '/orders', model)).toBeUndefined();
    const intersection: SchemaModel = { kind: 'intersection', members: [ORDER_PAGE] };
    expect(resolveSchemaPointer(intersection, '/orders', model)).toBeUndefined();
  });

  it('bails when a step lands on a scalar', () => {
    expect(resolveSchemaPointer(ORDER_PAGE, '/nextCursor/deeper', model)).toBeUndefined();
  });

  it('follows a ref chain through the named schemas', () => {
    const chained = modelWith([], {
      schemas: [
        namedSchema('A', { kind: 'ref', name: 'B' }),
        namedSchema('B', ORDER_PAGE),
        namedSchema('Order', ORDER),
      ],
    });
    expect(resolveSchemaPointer({ kind: 'ref', name: 'A' }, '/orders', chained)).toBe(ORDER_LIST);
  });

  it('returns undefined for a ref cycle', () => {
    const cyclic = modelWith([], {
      schemas: [
        namedSchema('A', { kind: 'ref', name: 'B' }),
        namedSchema('B', { kind: 'ref', name: 'A' }),
      ],
    });
    expect(resolveSchemaPointer({ kind: 'ref', name: 'A' }, '/x', cyclic)).toBeUndefined();
  });

  it('returns undefined for an unknown ref, at the root and mid-walk', () => {
    expect(resolveSchemaPointer({ kind: 'ref', name: 'Ghost' }, '/x', model)).toBeUndefined();
    const root: SchemaModel = {
      kind: 'object',
      properties: [{ name: 'data', schema: { kind: 'ref', name: 'Ghost' }, required: true }],
    };
    expect(resolveSchemaPointer(root, '/data/x', model)).toBeUndefined();
  });

  it('unescapes ~1 and ~0 tokens per RFC 6901', () => {
    const root: SchemaModel = {
      kind: 'object',
      properties: [{ name: 'a/b~c', schema: ORDER_LIST, required: true }],
    };
    expect(resolveSchemaPointer(root, '/a~1b~0c', model)).toBe(ORDER_LIST);
  });
});

describe('resolveOperationPagination — sources and precedence', () => {
  it('resolves nothing when no source declares pagination', () => {
    expect(resolveOperationPagination(listOrders(), modelWith([listOrders()]), undefined)).toEqual(
      {}
    );
    expect(resolveOperationPagination(listOrders(), modelWith([listOrders()]), {})).toEqual({});
  });

  it('applies a per-operation config rule', () => {
    const result = resolveOperationPagination(listOrders(), modelWith([listOrders()]), {
      operations: { listOrders: CURSOR_RULE },
    });
    expect(result.error).toBeUndefined();
    expect(result.spec).toEqual({
      style: 'cursor',
      param: 'cursor',
      nextCursor: '/nextCursor',
      items: '/orders',
    });
    expect(result.itemSchema).toEqual({ kind: 'ref', name: 'Order' });
  });

  it('verifies an optional hasMore pointer (boolean) and carries it into the spec', () => {
    const connectionPage: SchemaModel = {
      kind: 'object',
      properties: [
        { name: 'orders', schema: ORDER_LIST, required: true },
        { name: 'endCursor', schema: SCALAR, required: false },
        {
          name: 'pageInfo',
          schema: {
            kind: 'object',
            properties: [
              {
                name: 'hasNextPage',
                schema: { kind: 'scalar', scalar: 'boolean' },
                required: true,
              },
            ],
          },
          required: true,
        },
      ],
    };
    const op = listOrders({ successResponses: [response({ schema: connectionPage })] });
    const rule: PaginationRule = {
      style: 'cursor',
      cursorParam: 'cursor',
      nextCursor: '/endCursor',
      hasMore: '/pageInfo/hasNextPage',
      items: '/orders',
    };
    const result = resolveOperationPagination(op, modelWith([op]), {
      operations: { listOrders: rule },
    });
    expect(result.error).toBeUndefined();
    expect(result.spec?.hasMore).toBe('/pageInfo/hasNextPage');

    const missing = resolveOperationPagination(op, modelWith([op]), {
      operations: { listOrders: { ...rule, hasMore: '/pageInfo/missing' } },
    });
    expect(missing.error).toContain('"hasMore" pointer "/pageInfo/missing" does not resolve');

    const notBoolean = resolveOperationPagination(op, modelWith([op]), {
      operations: { listOrders: { ...rule, hasMore: '/endCursor' } },
    });
    expect(notBoolean.error).toContain('must point at a boolean');
  });

  it('accepts an empty items pointer for a response whose body IS the item array', () => {
    const op = listOrders({
      successResponses: [
        response({ schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } } }),
      ],
    });
    const result = resolveOperationPagination(op, modelWith([op]), {
      operations: { listOrders: { style: 'offset', offsetParam: 'offset', items: '' } },
    });
    expect(result.error).toBeUndefined();
    expect(result.spec).toEqual({ style: 'offset', param: 'offset', items: '' });
    expect(result.itemSchema).toEqual({ kind: 'ref', name: 'Order' });
  });

  it('applies the x-pagination extension when no per-op rule exists', () => {
    const op = listOrders({ paginationExtension: OFFSET_RULE });
    const result = resolveOperationPagination(op, modelWith([op]), undefined);
    expect(result.spec).toEqual({ style: 'offset', param: 'offset', items: '/orders' });
  });

  it('applies the convention rule when config.style is set', () => {
    const result = resolveOperationPagination(listOrders(), modelWith([listOrders()]), {
      ...PAGE_RULE,
      exclude: ['otherOp'],
    });
    expect(result.spec).toEqual({ style: 'page', param: 'page', items: '/orders' });
  });

  it('per-op config beats the extension, which beats the convention', () => {
    const op = listOrders({ paginationExtension: OFFSET_RULE });
    const model = modelWith([op]);
    const perOpWins = resolveOperationPagination(op, model, {
      ...PAGE_RULE,
      operations: { listOrders: CURSOR_RULE },
    });
    expect(perOpWins.spec?.style).toBe('cursor');
    const extensionWins = resolveOperationPagination(op, model, { ...PAGE_RULE });
    expect(extensionWins.spec?.style).toBe('offset');
  });

  it('matches exclude and operations keys against the spec operationId of a renamed op', () => {
    const op = listOrders({ name: 'list_orders', specName: 'list-orders' });
    expect(
      resolveOperationPagination(op, modelWith([op]), { ...PAGE_RULE, exclude: ['list-orders'] })
    ).toEqual({});
    const result = resolveOperationPagination(op, modelWith([op]), {
      operations: { 'list-orders': CURSOR_RULE },
    });
    expect(result.error).toBeUndefined();
    expect(result.spec?.style).toBe('cursor');
  });

  it('exclude kills every source for the operation', () => {
    const op = listOrders({ paginationExtension: OFFSET_RULE });
    const result = resolveOperationPagination(op, modelWith([op]), {
      ...PAGE_RULE,
      exclude: ['listOrders'],
      operations: { listOrders: CURSOR_RULE },
    });
    expect(result).toEqual({});
  });

  it('carries limitParam into the spec when set', () => {
    const result = resolveOperationPagination(listOrders(), modelWith([listOrders()]), {
      operations: { listOrders: { ...OFFSET_RULE, limitParam: 'limit' } },
    });
    expect(result.spec).toEqual({
      style: 'offset',
      param: 'offset',
      limitParam: 'limit',
      items: '/orders',
    });
  });
});

describe('resolveOperationPagination — rule-shape validation (any source)', () => {
  const model = () => modelWith([listOrders()]);

  it.each([
    ['a non-object rule', 'nonsense', 'the rule must be an object'],
    [
      'an unknown style',
      { ...CURSOR_RULE, style: 'link' },
      '"style" must be one of "cursor" | "offset" | "page" (got "link")',
    ],
    [
      'a missing style',
      { items: '/orders' },
      '"style" must be one of "cursor" | "offset" | "page" (got undefined)',
    ],
    [
      'missing items',
      { style: 'cursor', cursorParam: 'cursor', nextCursor: '/nextCursor' },
      '"items" must be a JSON pointer starting with "/" (or "" when the response body is the item array itself)',
    ],
    [
      'an items pointer without the leading slash',
      { ...OFFSET_RULE, items: 'orders' },
      '"items" must be a JSON pointer starting with "/" (or "" when the response body is the item array itself)',
    ],
    [
      'cursor style without cursorParam',
      { style: 'cursor', nextCursor: '/nextCursor', items: '/orders' },
      'cursor style requires a "cursorParam" query parameter name',
    ],
    [
      'cursor style without nextCursor',
      { style: 'cursor', cursorParam: 'cursor', items: '/orders' },
      'cursor style requires a "nextCursor" JSON pointer starting with "/"',
    ],
    [
      'a nextCursor pointer without the leading slash',
      { ...CURSOR_RULE, nextCursor: 'nextCursor' },
      'cursor style requires a "nextCursor" JSON pointer starting with "/"',
    ],
    [
      'offset style without offsetParam',
      { style: 'offset', items: '/orders' },
      'offset style requires an "offsetParam" query parameter name',
    ],
    [
      'page style with an empty offsetParam',
      { style: 'page', offsetParam: '', items: '/orders' },
      'page style requires an "offsetParam" query parameter name',
    ],
    [
      'a non-string limitParam',
      { ...OFFSET_RULE, limitParam: 25 },
      '"limitParam" must be a query parameter name',
    ],
  ])('rejects %s from the extension with the x-pagination source', (_case, rule, problem) => {
    const op = listOrders({ paginationExtension: rule });
    const { spec, error } = resolveOperationPagination(op, model(), undefined);
    expect(spec).toBeUndefined();
    expect(error).toBe(`Pagination for operation "listOrders" (x-pagination): ${problem}`);
  });

  it('names the per-operation config source in shape errors', () => {
    const { error } = resolveOperationPagination(listOrders(), model(), {
      operations: { listOrders: { style: 'offset', items: '/orders' } as PaginationRule },
    });
    expect(error).toBe(
      'Pagination for operation "listOrders" (pagination.operations["listOrders"]): ' +
        'offset style requires an "offsetParam" query parameter name'
    );
  });

  it('rejects a malformed convention too — a config bug, never silence', () => {
    const { error } = resolveOperationPagination(listOrders(), model(), {
      style: 'cursor',
      items: '/orders',
    });
    expect(error).toBe(
      'Pagination for operation "listOrders" (pagination convention): ' +
        'cursor style requires a "cursorParam" query parameter name'
    );
  });
});

describe('resolveOperationPagination — fit verification', () => {
  it.each([
    [
      'an advance param missing from the query params',
      { ...CURSOR_RULE, cursorParam: 'after' },
      'query parameter "after" is not declared on the operation',
    ],
    [
      'an unresolvable items pointer',
      { ...OFFSET_RULE, items: '/results' },
      'the "items" pointer "/results" does not resolve in the success response schema',
    ],
    [
      'an items pointer landing on a non-array',
      { ...OFFSET_RULE, items: '/nextCursor' },
      'the "items" pointer "/nextCursor" must point at an array (got scalar)',
    ],
    [
      'an unresolvable nextCursor pointer',
      { ...CURSOR_RULE, nextCursor: '/meta/next' },
      'the "nextCursor" pointer "/meta/next" does not resolve in the success response schema',
    ],
  ])('explicit source: %s is an error', (_case, rule, problem) => {
    const op = listOrders({ paginationExtension: rule });
    const { spec, error } = resolveOperationPagination(op, modelWith([op]), undefined);
    expect(spec).toBeUndefined();
    expect(error).toBe(`Pagination for operation "listOrders" (x-pagination): ${problem}`);
  });

  it('convention that does not fit resolves to nothing, silently', () => {
    const model = modelWith([listOrders()]);
    for (const rule of [
      { ...CURSOR_RULE, cursorParam: 'after' },
      { ...OFFSET_RULE, items: '/results' },
      { ...OFFSET_RULE, items: '/nextCursor' },
      { ...CURSOR_RULE, nextCursor: '/meta/next' },
    ]) {
      expect(resolveOperationPagination(listOrders(), model, rule)).toEqual({});
    }
  });

  it('requires a JSON success response', () => {
    const op = listOrders({
      paginationExtension: OFFSET_RULE,
      successResponses: [response({ contentType: 'text/plain' })],
    });
    const { error } = resolveOperationPagination(op, modelWith([op]), undefined);
    expect(error).toBe(
      'Pagination for operation "listOrders" (x-pagination): ' +
        'the operation has no JSON success response'
    );
    const conventionOnly = listOrders({
      successResponses: [response({ contentType: 'text/plain' })],
    });
    expect(
      resolveOperationPagination(conventionOnly, modelWith([conventionOnly]), { ...OFFSET_RULE })
    ).toEqual({});
  });

  it('never paginates a Server-Sent Events operation (explicit source errors)', () => {
    const sseOp = listOrders({
      paginationExtension: OFFSET_RULE,
      successResponses: [response({ contentType: 'text/event-stream' })],
    });
    const { error } = resolveOperationPagination(sseOp, modelWith([sseOp]), undefined);
    expect(error).toBe(
      'Pagination for operation "listOrders" (x-pagination): ' +
        'the operation is a Server-Sent Events stream'
    );
    const conventionOnly = listOrders({
      successResponses: [response({ contentType: 'text/event-stream' })],
    });
    expect(
      resolveOperationPagination(conventionOnly, modelWith([conventionOnly]), OFFSET_RULE)
    ).toEqual({});
  });

  it('resolves pointers over the JSON success response even when another response comes first', () => {
    const op = listOrders({
      paginationExtension: CURSOR_RULE,
      successResponses: [
        response({ contentType: 'text/plain' }),
        response({ schema: { kind: 'ref', name: 'OrderPage' }, status: 200 }),
      ],
    });
    const result = resolveOperationPagination(op, modelWith([op]), undefined);
    expect(result.spec?.style).toBe('cursor');
    expect(result.itemSchema).toEqual({ kind: 'ref', name: 'Order' });
  });

  describe('advance param schema fit', () => {
    /** `listOrders` whose single query param carries the given schema. */
    const withParamSchema = (name: string, schema: SchemaModel, rule: unknown): OperationModel =>
      listOrders({ paginationExtension: rule, queryParams: [param(name, 'query', false, schema)] });

    it.each<[string, PaginationRule, string, SchemaModel, string]>([
      [
        'a numeric cursor param',
        CURSOR_RULE,
        'cursor',
        { kind: 'scalar', scalar: 'integer' },
        'the "cursorParam" query parameter "cursor" must accept a string (got integer)',
      ],
      [
        'an object cursor param',
        CURSOR_RULE,
        'cursor',
        ORDER,
        'the "cursorParam" query parameter "cursor" must accept a string (got object)',
      ],
      [
        'a string offset param',
        OFFSET_RULE,
        'offset',
        SCALAR,
        'the "offsetParam" query parameter "offset" must accept a number (got string)',
      ],
      [
        'a boolean offset param',
        OFFSET_RULE,
        'offset',
        { kind: 'scalar', scalar: 'boolean' },
        'the "offsetParam" query parameter "offset" must accept a number (got boolean)',
      ],
      [
        'a numeric-enum page param (numbers must be plain scalars)',
        PAGE_RULE,
        'page',
        { kind: 'enum', values: [1, 2], scalar: 'integer' },
        'the "offsetParam" query parameter "page" must accept a number (got integer)',
      ],
      [
        'an object page param',
        PAGE_RULE,
        'page',
        ORDER,
        'the "offsetParam" query parameter "page" must accept a number (got object)',
      ],
      [
        'an unresolvable-ref offset param',
        OFFSET_RULE,
        'offset',
        { kind: 'ref', name: 'Ghost' },
        'the "offsetParam" query parameter "offset" must accept a number (got an unresolvable ref)',
      ],
    ])('explicit source: %s is an error', (_case, rule, name, schema, problem) => {
      const op = withParamSchema(name, schema, rule);
      const { spec, error } = resolveOperationPagination(op, modelWith([op]), undefined);
      expect(spec).toBeUndefined();
      expect(error).toBe(`Pagination for operation "listOrders" (x-pagination): ${problem}`);
    });

    it('convention with a misfitting advance param resolves to nothing, silently', () => {
      for (const [rule, name, schema] of [
        [CURSOR_RULE, 'cursor', { kind: 'scalar', scalar: 'integer' }],
        [OFFSET_RULE, 'offset', SCALAR],
        [PAGE_RULE, 'page', ORDER],
      ] as Array<[PaginationRule, string, SchemaModel]>) {
        const op = listOrders({ queryParams: [param(name, 'query', false, schema)] });
        expect(resolveOperationPagination(op, modelWith([op]), rule)).toEqual({});
      }
    });

    it('resolves the advance param schema through refs (string cursor, integer offset)', () => {
      const schemas = [
        namedSchema('Order', ORDER),
        namedSchema('OrderPage', ORDER_PAGE),
        namedSchema('Cursor', SCALAR),
        namedSchema('Offset', { kind: 'scalar', scalar: 'integer' }),
      ];
      const cursorOp = withParamSchema('cursor', { kind: 'ref', name: 'Cursor' }, CURSOR_RULE);
      expect(
        resolveOperationPagination(cursorOp, modelWith([cursorOp], { schemas }), undefined).spec
          ?.style
      ).toBe('cursor');
      const offsetOp = withParamSchema('offset', { kind: 'ref', name: 'Offset' }, OFFSET_RULE);
      expect(
        resolveOperationPagination(offsetOp, modelWith([offsetOp], { schemas }), undefined).spec
          ?.style
      ).toBe('offset');
    });

    it('tolerates a nullable string union on the cursor param (same predicate as nextCursor)', () => {
      const op = withParamSchema(
        'cursor',
        { kind: 'union', members: [SCALAR, { kind: 'null' }] },
        CURSOR_RULE
      );
      const result = resolveOperationPagination(op, modelWith([op]), undefined);
      expect(result.error).toBeUndefined();
      expect(result.spec?.param).toBe('cursor');
    });
  });

  describe('nextCursor string-ish check', () => {
    function cursorWith(nextCursorSchema: SchemaModel): {
      op: OperationModel;
      model: ApiModel;
    } {
      const page: SchemaModel = {
        kind: 'object',
        properties: [
          { name: 'orders', schema: ORDER_LIST, required: true },
          { name: 'nextCursor', schema: nextCursorSchema, required: false },
        ],
      };
      const op = listOrders({
        paginationExtension: CURSOR_RULE,
        successResponses: [response({ schema: page })],
      });
      return { op, model: modelWith([op]) };
    }

    it.each<[string, SchemaModel]>([
      ['a string scalar', SCALAR],
      ['a string enum', { kind: 'enum', values: ['a', 'b'], scalar: 'string' }],
      ['a string literal', { kind: 'literal', value: 'next' }],
      ['a nullable string union', { kind: 'union', members: [SCALAR, { kind: 'null' }] }],
      [
        'a nullable string union through a ref',
        { kind: 'union', members: [{ kind: 'ref', name: 'Cursor' }, { kind: 'null' }] },
      ],
    ])('accepts %s', (_label, schema) => {
      const { op } = cursorWith(schema);
      const model = modelWith([op], {
        schemas: [namedSchema('Order', ORDER), namedSchema('Cursor', SCALAR)],
      });
      const result = resolveOperationPagination(op, model, undefined);
      expect(result.error).toBeUndefined();
      expect(result.spec?.nextCursor).toBe('/nextCursor');
    });

    it.each<[string, SchemaModel]>([
      ['a number scalar', { kind: 'scalar', scalar: 'number' }],
      ['a numeric enum', { kind: 'enum', values: [1, 2], scalar: 'number' }],
      ['a numeric literal', { kind: 'literal', value: 7 }],
      ['an object', ORDER],
      ['a union with a non-string member', { kind: 'union', members: [SCALAR, ORDER] }],
      [
        'a union nesting another union',
        { kind: 'union', members: [{ kind: 'union', members: [SCALAR] }, { kind: 'null' }] },
      ],
      [
        'a union whose member ref is unresolvable',
        { kind: 'union', members: [{ kind: 'ref', name: 'Ghost' }, { kind: 'null' }] },
      ],
    ])('rejects %s', (_label, schema) => {
      const { op, model } = cursorWith(schema);
      const { error } = resolveOperationPagination(op, model, undefined);
      expect(error).toContain('the "nextCursor" pointer "/nextCursor" must point at a string');
    });
  });
});

describe('resolveModelPagination', () => {
  it('maps only the operations that resolve, keyed by operation name', () => {
    const paginated = listOrders({ paginationExtension: CURSOR_RULE });
    const plain = operation({ name: 'getOrder', path: '/orders/{id}' });
    const map = resolveModelPagination(modelWith([paginated, plain]), undefined);
    expect([...map.keys()]).toEqual(['listOrders']);
    expect(map.get('listOrders')).toEqual({
      spec: { style: 'cursor', param: 'cursor', nextCursor: '/nextCursor', items: '/orders' },
      itemSchema: { kind: 'ref', name: 'Order' },
    });
  });

  it('aggregates every error into one throw, listing each operation', () => {
    const bad1 = listOrders({
      name: 'listOrders',
      paginationExtension: { ...CURSOR_RULE, cursorParam: 'after' },
    });
    const bad2 = listOrders({
      name: 'listRefunds',
      paginationExtension: { style: 'nope' },
    });
    expect(() => resolveModelPagination(modelWith([bad1, bad2]), undefined)).toThrow(
      'Invalid pagination configuration:\n' +
        '  - Pagination for operation "listOrders" (x-pagination): ' +
        'query parameter "after" is not declared on the operation\n' +
        '  - Pagination for operation "listRefunds" (x-pagination): ' +
        '"style" must be one of "cursor" | "offset" | "page" (got "nope")'
    );
  });

  it('returns an empty map for a model with no pagination anywhere', () => {
    expect(resolveModelPagination(modelWith([listOrders()]), undefined).size).toBe(0);
  });
});
