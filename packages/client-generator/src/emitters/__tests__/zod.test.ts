import type { NamedSchemaModel, SchemaModel } from '../../intermediate-representation/model.js';
import { printStatements } from '../ts.js';
import { renderZodModule, schemaToZodExpression } from '../zod.js';
import { apiModel, operation, response } from './fixtures.js';

/** Print a single expression by wrapping it in a throwaway const. */
function expr(schema: SchemaModel): string {
  return renderZodModule(apiModel({ schemas: [{ name: 'X', schema }] }))
    .split('= ')[1]
    .replace(/;$/, '');
}

describe('schemaToZodExpression — scalars', () => {
  it('string → z.string()', () => {
    expect(expr({ kind: 'scalar', scalar: 'string' })).toBe('z.string()');
  });

  it('number → z.number()', () => {
    expect(expr({ kind: 'scalar', scalar: 'number' })).toBe('z.number()');
  });

  it('boolean → z.boolean()', () => {
    expect(expr({ kind: 'scalar', scalar: 'boolean' })).toBe('z.boolean()');
  });

  it('integer → z.number().int()', () => {
    expect(expr({ kind: 'scalar', scalar: 'integer' })).toBe('z.number().int()');
  });

  it('binary-format string → z.instanceof(Blob) (matches the Blob TS type)', () => {
    expect(expr({ kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } })).toBe(
      'z.instanceof(Blob)'
    );
  });
});

describe('schemaToZodExpression — object', () => {
  it('emits required and optional properties', () => {
    const out = expr({
      kind: 'object',
      properties: [
        { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
        { name: 'name', schema: { kind: 'scalar', scalar: 'string' }, required: false },
      ],
    });
    expect(out).toContain('z.object({');
    expect(out).toContain('id: z.number().int()');
    expect(out).toContain('name: z.string().optional()');
  });

  it('quotes non-identifier keys', () => {
    const out = expr({
      kind: 'object',
      properties: [
        { name: 'x-trace', schema: { kind: 'scalar', scalar: 'string' }, required: true },
      ],
    });
    expect(out).toContain('"x-trace": z.string()');
  });

  it('emits an empty object literal for no properties', () => {
    expect(expr({ kind: 'object', properties: [] })).toBe('z.object({})');
  });
});

describe('schemaToZodExpression — composites', () => {
  it('array → z.array(items)', () => {
    expect(expr({ kind: 'array', items: { kind: 'scalar', scalar: 'string' } })).toBe(
      'z.array(z.string())'
    );
  });

  it('record → z.record(z.string(), value)', () => {
    expect(expr({ kind: 'record', value: { kind: 'scalar', scalar: 'number' } })).toBe(
      'z.record(z.string(), z.number())'
    );
  });

  it('ref → z.lazy(() => <Name>Schema)', () => {
    expect(expr({ kind: 'ref', name: 'pet' })).toBe('z.lazy(() => PetSchema)');
  });

  it('omit → <Base>Schema.omit({ k: true })', () => {
    expect(expr({ kind: 'omit', base: 'pet', keys: ['id', 'x-trace'] })).toBe(
      'PetSchema.omit({ id: true, "x-trace": true })'
    );
  });
});

describe('schemaToZodExpression — literals and enums', () => {
  it('string literal → z.literal("a")', () => {
    expect(expr({ kind: 'literal', value: 'a' })).toBe('z.literal("a")');
  });

  it('number literal → z.literal(1)', () => {
    expect(expr({ kind: 'literal', value: 1 })).toBe('z.literal(1)');
  });

  it('negative number literal uses a prefix-unary minus', () => {
    expect(expr({ kind: 'literal', value: -2 })).toBe('z.literal(-2)');
  });

  it('boolean literal → z.literal(true)', () => {
    expect(expr({ kind: 'literal', value: true })).toBe('z.literal(true)');
    expect(expr({ kind: 'literal', value: false })).toBe('z.literal(false)');
  });

  it('all-string enum → z.enum([…])', () => {
    expect(expr({ kind: 'enum', scalar: 'string', values: ['a', 'b'] })).toBe('z.enum(["a", "b"])');
  });

  it('mixed/number enum → z.union of literals', () => {
    expect(expr({ kind: 'enum', scalar: 'number', values: [1, 2] })).toBe(
      'z.union([z.literal(1), z.literal(2)])'
    );
  });
});

describe('schemaToZodExpression — unions and intersections', () => {
  it('multi-member union → z.union([…])', () => {
    expect(
      expr({
        kind: 'union',
        members: [
          { kind: 'scalar', scalar: 'string' },
          { kind: 'scalar', scalar: 'number' },
        ],
      })
    ).toBe('z.union([z.string(), z.number()])');
  });

  it('single-member union collapses to the member', () => {
    expect(expr({ kind: 'union', members: [{ kind: 'scalar', scalar: 'boolean' }] })).toBe(
      'z.boolean()'
    );
  });

  it('intersection chains .and', () => {
    expect(
      expr({
        kind: 'intersection',
        members: [
          { kind: 'ref', name: 'a' },
          { kind: 'ref', name: 'b' },
          { kind: 'ref', name: 'c' },
        ],
      })
    ).toBe('z.lazy(() => ASchema).and(z.lazy(() => BSchema)).and(z.lazy(() => CSchema))');
  });
});

describe('schemaToZodExpression — null and unknown', () => {
  it('null → z.null()', () => {
    expect(expr({ kind: 'null' })).toBe('z.null()');
  });

  it('unknown → z.unknown()', () => {
    expect(expr({ kind: 'unknown' })).toBe('z.unknown()');
  });
});

describe('schemaToZodExpression — refinements', () => {
  it('string min/max/pattern', () => {
    expect(
      expr({
        kind: 'scalar',
        scalar: 'string',
        metadata: { minLength: 1, maxLength: 5, pattern: '^a.+$' },
      })
    ).toBe('z.string().min(1).max(5).regex(new RegExp("^a.+$"))');
  });

  it('number bounds and exclusive bounds', () => {
    expect(
      expr({
        kind: 'scalar',
        scalar: 'number',
        metadata: { minimum: 0, maximum: 10, exclusiveMinimum: 1, exclusiveMaximum: 9 },
      })
    ).toBe('z.number().min(0).max(10).gt(1).lt(9)');
  });

  it('integer keeps .int() before bounds', () => {
    expect(expr({ kind: 'scalar', scalar: 'integer', metadata: { minimum: -5, maximum: 5 } })).toBe(
      'z.number().int().min(-5).max(5)'
    );
  });

  it('array min/max items', () => {
    expect(
      expr({
        kind: 'array',
        items: { kind: 'scalar', scalar: 'string' },
        metadata: { minItems: 1, maxItems: 3 },
      })
    ).toBe('z.array(z.string()).min(1).max(3)');
  });

  it('ignores metadata on kinds without a stable refinement (e.g. boolean)', () => {
    expect(expr({ kind: 'scalar', scalar: 'boolean', metadata: { minimum: 1 } })).toBe(
      'z.boolean()'
    );
  });

  it('emits only the string refinements that are set (others skipped)', () => {
    expect(expr({ kind: 'scalar', scalar: 'string', metadata: { maxLength: 5 } })).toBe(
      'z.string().max(5)'
    );
  });

  it('emits only the number refinements that are set (others skipped)', () => {
    expect(expr({ kind: 'scalar', scalar: 'number', metadata: { maximum: 9 } })).toBe(
      'z.number().max(9)'
    );
    expect(expr({ kind: 'scalar', scalar: 'number', metadata: { exclusiveMaximum: 9 } })).toBe(
      'z.number().lt(9)'
    );
  });

  it('emits only the array refinements that are set (others skipped)', () => {
    expect(
      expr({
        kind: 'array',
        items: { kind: 'scalar', scalar: 'string' },
        metadata: { maxItems: 3 },
      })
    ).toBe('z.array(z.string()).max(3)');
    expect(
      expr({
        kind: 'array',
        items: { kind: 'scalar', scalar: 'string' },
        metadata: { minItems: 1 },
      })
    ).toBe('z.array(z.string()).min(1)');
  });

  it('an empty metadata object adds no refinements', () => {
    expect(expr({ kind: 'scalar', scalar: 'string', metadata: {} })).toBe('z.string()');
  });
});

describe('renderZodModule', () => {
  it('returns empty string when there is nothing to emit', () => {
    expect(renderZodModule(apiModel())).toBe('');
  });

  it('emits the z import and one export const per schema', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Pet',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            { name: 'tag', schema: { kind: 'scalar', scalar: 'string' }, required: false },
          ],
        },
      },
    ];
    const out = renderZodModule(apiModel({ schemas }));
    expect(out).toContain('import { z } from "zod";');
    expect(out).toContain('export const PetSchema = z.object({');
    // No operation has a JSON body -> no validation surface.
    expect(out).not.toContain('operationSchemas');
    expect(out).not.toContain('zodValidation');
  });
});

describe('renderZodModule — operation validation surface', () => {
  const model = (op: Parameters<typeof operation>[0]) =>
    apiModel({ services: [{ name: 'Default', operations: [operation(op)] }] });

  it('maps a JSON request body and response by operationId and emits the middleware', () => {
    const out = renderZodModule(
      model({
        name: 'createOrder',
        method: 'post',
        requestBody: {
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'OrderInput' },
          required: true,
        },
        successResponses: [response({ schema: { kind: 'ref', name: 'Order' } })],
      })
    );
    expect(out).toContain('export const operationSchemas: {');
    expect(out).toContain(
      'createOrder: { request: z.lazy(() => OrderInputSchema), response: z.lazy(() => OrderSchema) }'
    );
    expect(out).toContain('export function zodValidation(');
    expect(out).toContain('export class ZodValidationError extends Error {');
  });

  it('keys operationSchemas by the SPEC operationId (quoted when not an identifier)', () => {
    // The middleware looks entries up by `ctx.operation.id`, which is the spec's
    // operationId — a sanitized-away name (`list-orders` → `list_orders`) must not leak
    // into the keys or every lookup for that operation misses.
    const out = renderZodModule(
      model({
        name: 'list_orders',
        specName: 'list-orders',
        method: 'get',
        successResponses: [response({ schema: { kind: 'ref', name: 'Order' } })],
      })
    );
    expect(out).toContain('"list-orders": { response: z.lazy(() => OrderSchema) }');
    expect(out).not.toContain('list_orders:');
  });

  it('annotates the map with z.ZodType so declaration emit stays small (TS7056)', () => {
    const out = renderZodModule(
      model({
        name: 'createOrder',
        method: 'post',
        requestBody: {
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'OrderInput' },
          required: true,
        },
        successResponses: [response({ schema: { kind: 'ref', name: 'Order' } })],
      })
    );
    expect(out).toContain(
      'createOrder: {\n        request: z.ZodType;\n        response: z.ZodType;\n    };'
    );
  });

  it('distributes a readOnly omit into an allOf intersection instead of calling .omit on it', () => {
    const out = renderZodModule(
      apiModel({
        schemas: [
          {
            name: 'Base',
            schema: {
              kind: 'object',
              properties: [
                { name: 'id', schema: { kind: 'scalar', scalar: 'string' }, required: true },
                { name: 'name', schema: { kind: 'scalar', scalar: 'string' }, required: true },
              ],
            },
          },
          {
            name: 'Combined',
            schema: {
              kind: 'intersection',
              members: [
                { kind: 'ref', name: 'Base' },
                {
                  kind: 'object',
                  properties: [
                    {
                      name: 'extra',
                      schema: { kind: 'scalar', scalar: 'string' },
                      required: false,
                    },
                  ],
                },
              ],
            },
          },
        ],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'createCombined',
                method: 'post',
                requestBody: {
                  contentType: 'application/json',
                  schema: { kind: 'omit', base: 'Combined', keys: ['id'] },
                  required: true,
                },
              }),
            ],
          },
        ],
      })
    );
    // ZodIntersection has no .omit — the omission lands on the object members instead.
    expect(out).not.toContain('CombinedSchema.omit');
    expect(out).toContain('BaseSchema.omit({ id: true })');
  });

  it('renders an inline (non-ref) body schema in place', () => {
    const out = renderZodModule(
      model({
        name: 'ping',
        successResponses: [
          response({
            schema: {
              kind: 'object',
              properties: [
                { name: 'ok', schema: { kind: 'scalar', scalar: 'boolean' }, required: true },
              ],
            },
          }),
        ],
      })
    );
    expect(out).toContain('ping: { response: z.object(');
  });

  it('skips SSE operations and non-JSON bodies', () => {
    const out = renderZodModule(
      apiModel({
        schemas: [{ name: 'Keep', schema: { kind: 'scalar', scalar: 'string' } }],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'stream',
                successResponses: [
                  response({
                    contentType: 'text/event-stream',
                    schema: { kind: 'ref', name: 'Keep' },
                  }),
                ],
              }),
              operation({
                name: 'upload',
                method: 'post',
                requestBody: {
                  contentType: 'application/octet-stream',
                  schema: { kind: 'scalar', scalar: 'string' },
                  required: true,
                },
              }),
            ],
          },
        ],
      })
    );
    expect(out).toContain('export const KeepSchema');
    expect(out).not.toContain('operationSchemas');
  });
});

describe('schemaToZodExpression — direct export', () => {
  it('is callable directly and returns an expression node', () => {
    const node = schemaToZodExpression({ kind: 'scalar', scalar: 'string' });
    expect(printStatements([node])).toBe('z.string()');
  });
});
