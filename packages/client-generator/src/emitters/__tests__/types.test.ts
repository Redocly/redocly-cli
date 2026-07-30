import type { PropertyModel, SchemaModel } from '../../intermediate-representation/model.js';
import { emitClientSingleFile } from '../client-assembly.js';
import { printNodes } from '../ts.js';
import { renderSchema, schemaToTypeNode, typesStatements } from '../types.js';
import { SCALAR, apiModel, namedSchema } from './fixtures.js';

// The package arm keeps the emitted text free of the embedded runtime, so the
// absence assertions below test the schema types/guards alone.
const emitPackage: typeof emitClientSingleFile = (model, options = {}) =>
  emitClientSingleFile(model, { ...options, runtime: 'package' });

describe('renderTypes', () => {
  it('produces nothing when there are no schemas', () => {
    const out = emitPackage(apiModel({ schemas: [] }));
    // Two consecutive blank lines would be a sign of an empty types block; check absence.
    expect(out).not.toContain('export type T');
  });

  it('emits each named schema with its description', () => {
    const out = emitPackage(
      apiModel({
        schemas: [namedSchema('Foo', { kind: 'scalar', scalar: 'string' }, 'a foo')],
      })
    );
    expect(out).toContain('/**\n * a foo\n */');
    expect(out).toContain('export type Foo = string;');
  });

  it('prefers schema description over the named-schema description', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Foo', { kind: 'scalar', scalar: 'string', description: 'inner' }, 'outer'),
        ],
      })
    );
    expect(out).toContain('/**\n * inner\n */');
    expect(out).not.toContain('outer');
  });

  it('omits JSDoc when the schema description is whitespace-only', () => {
    // Exercises the `!text.trim()` short-circuit inside renderJsDoc.
    const out = emitPackage(
      apiModel({
        schemas: [namedSchema('Foo', { kind: 'scalar', scalar: 'string' }, '   ')],
      })
    );
    expect(out).not.toContain('/**  ');
    expect(out).toContain('export type Foo = string;');
  });

  it('trims leading and trailing blank lines from multi-line schema descriptions', () => {
    // Exercises both `start++` and `end--` arms of trimLines.
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Foo', {
            kind: 'scalar',
            scalar: 'string',
            description: '\n\nfirst\nsecond\n\n',
          }),
        ],
      })
    );
    expect(out).toContain('/**\n * first\n * second\n */');
    expect(out).not.toMatch(/\/\*\*\n \*\n/);
  });
});

describe('renderSchema (and its branches)', () => {
  it('renders scalars: string/number/integer/boolean', () => {
    expect(renderSchema({ kind: 'scalar', scalar: 'string' })).toBe('string');
    expect(renderSchema({ kind: 'scalar', scalar: 'number' })).toBe('number');
    expect(renderSchema({ kind: 'scalar', scalar: 'integer' })).toBe('number');
    expect(renderSchema({ kind: 'scalar', scalar: 'boolean' })).toBe('boolean');
  });

  it('renders a ref as the bare name', () => {
    expect(renderSchema({ kind: 'ref', name: 'Foo' })).toBe('Foo');
  });

  it('renders a binary-format string as Blob (file/upload content)', () => {
    expect(renderSchema({ kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } })).toBe(
      'Blob'
    );
    // `byte` (base64) stays a string; only `binary` is raw content.
    expect(renderSchema({ kind: 'scalar', scalar: 'string', metadata: { format: 'byte' } })).toBe(
      'string'
    );
  });

  it('renders string/number/boolean literals correctly', () => {
    expect(renderSchema({ kind: 'literal', value: 'hi' })).toBe('"hi"');
    expect(renderSchema({ kind: 'literal', value: 42 })).toBe('42');
    expect(renderSchema({ kind: 'literal', value: true })).toBe('true');
    expect(renderSchema({ kind: 'literal', value: false })).toBe('false');
  });

  it('renders negative number literals (built via a prefix-minus expression)', () => {
    // TypeScript's factory rejects a bare negative numeric literal — it must be a
    // unary-minus over a positive literal, which this exercises.
    expect(renderSchema({ kind: 'literal', value: -5 })).toBe('-5');
    expect(renderSchema({ kind: 'enum', values: [-1, 2], scalar: 'number' })).toBe('-1 | 2');
  });

  it('renders single-value enums without parens when wrapped in array (parens=true)', () => {
    expect(
      renderSchema({
        kind: 'array',
        items: { kind: 'enum', values: ['a'], scalar: 'string' },
      })
    ).toBe('"a"[]');
  });

  it('renders multi-value enums WITH parens when wrapped in array (parens=true)', () => {
    expect(
      renderSchema({
        kind: 'array',
        items: { kind: 'enum', values: ['a', 'b'], scalar: 'string' },
      })
    ).toBe('("a" | "b")[]');
  });

  it('renders number enums without JSON-quoting them', () => {
    expect(renderSchema({ kind: 'enum', values: [1, 2, 3], scalar: 'number' })).toBe('1 | 2 | 3');
  });

  it('renders boolean enums without JSON-quoting them', () => {
    expect(renderSchema({ kind: 'enum', values: [true, false], scalar: 'boolean' })).toBe(
      'true | false'
    );
  });

  it('renders null and unknown', () => {
    expect(renderSchema({ kind: 'null' })).toBe('null');
    expect(renderSchema({ kind: 'unknown' })).toBe('unknown');
  });

  it('renders array of scalars', () => {
    expect(renderSchema({ kind: 'array', items: SCALAR })).toBe('string[]');
  });

  it('parenthesizes unions inside arrays', () => {
    expect(
      renderSchema({
        kind: 'array',
        items: { kind: 'union', members: [SCALAR, { kind: 'null' }] },
      })
    ).toBe('(string | null)[]');
  });

  it('renders records', () => {
    expect(renderSchema({ kind: 'record', value: SCALAR })).toBe('Record<string, string>');
  });

  it('renders empty objects as `{}`', () => {
    expect(renderSchema({ kind: 'object', properties: [] })).toBe('{}');
  });

  it('renders required vs optional properties', () => {
    const props: PropertyModel[] = [
      { name: 'id', schema: SCALAR, required: true },
      { name: 'name', schema: SCALAR, required: false },
    ];
    const got = renderSchema({ kind: 'object', properties: props });
    expect(got).toContain('id: string;');
    expect(got).toContain('name?: string;');
  });

  it('renders an inline single-line JSDoc above a property with a short description', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [{ name: 'a', schema: SCALAR, required: true, description: 'short' }],
    });
    expect(got).toContain('    /**\n     * short\n     */\n    a: string;');
  });

  it('renders an inline multi-line JSDoc above a property with a long description', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [
        {
          name: 'a',
          schema: SCALAR,
          required: true,
          description: 'line1\nline2',
        },
      ],
    });
    expect(got).toContain('    /**\n     * line1\n     * line2\n     */\n');
  });

  it('emits a `readonly` modifier on readOnly properties', () => {
    // readOnly (server-managed) props are marked `readonly` so consumer write-type
    // utilities (e.g. OmitReadOnly<T>) can strip them; non-readOnly props are plain.
    const got = renderSchema({
      kind: 'object',
      properties: [
        { name: 'id', schema: SCALAR, required: true, readOnly: true },
        { name: 'name', schema: SCALAR, required: true },
      ],
    });
    expect(got).toContain('readonly id: string;');
    expect(got).toMatch(/\n {4}name: string;/);
    expect(got).not.toContain('readonly name');
  });

  it('renders an omit schema as Omit<Base, keys>', () => {
    expect(renderSchema({ kind: 'omit', base: 'Pet', keys: ['id', 'createdAt'] })).toBe(
      'Omit<Pet, "id" | "createdAt">'
    );
  });

  it('renders union and intersection', () => {
    expect(renderSchema({ kind: 'union', members: [SCALAR, { kind: 'null' }] })).toBe(
      'string | null'
    );
    const inter = renderSchema({
      kind: 'intersection',
      members: [
        { kind: 'ref', name: 'A' },
        { kind: 'ref', name: 'B' },
      ],
    });
    expect(inter).toBe('A & B');
  });

  it('quotes property names that contain disallowed characters', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [{ name: 'menu:read', schema: SCALAR, required: true }],
    });
    expect(got).toContain('"menu:read": string;');
  });

  it('quotes property names that are reserved words', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [{ name: 'class', schema: SCALAR, required: true }],
    });
    expect(got).toContain('"class": string;');
  });

  it('renders an inline empty-description JSDoc as nothing', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [{ name: 'a', schema: SCALAR, required: true, description: '   ' }],
    });
    // empty description ⇒ no JSDoc and no leading 2-space indent before the prop
    expect(got).not.toContain('/**');
    expect(got).toContain('  a: string;');
  });
});

describe('JSDoc validation metadata (@minimum / @maxLength / @pattern / @format / @deprecated)', () => {
  it('renders numeric constraints as JSDoc tags on a named schema', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Limit', {
            kind: 'scalar',
            scalar: 'integer',
            metadata: { minimum: 1, maximum: 100 },
          }),
        ],
      })
    );
    expect(out).toMatch(
      /\/\*\*[\s\S]*@minimum 1[\s\S]*@maximum 100[\s\S]*\*\/\s*export type Limit = number;/
    );
  });

  it('renders string constraints (minLength, maxLength, pattern, format) as JSDoc tags', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Name', {
            kind: 'scalar',
            scalar: 'string',
            metadata: {
              minLength: 1,
              maxLength: 50,
              pattern: '^[A-Z]+$',
              format: 'email',
            },
          }),
        ],
      })
    );
    expect(out).toContain('@minLength 1');
    expect(out).toContain('@maxLength 50');
    expect(out).toContain('@pattern ^[A-Z]+$');
    expect(out).toContain('@format email');
  });

  it('renders array constraints (minItems, maxItems, uniqueItems) as JSDoc tags', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Tags', {
            kind: 'array',
            items: { kind: 'scalar', scalar: 'string' },
            metadata: { minItems: 1, maxItems: 5, uniqueItems: true },
          }),
        ],
      })
    );
    expect(out).toContain('@minItems 1');
    expect(out).toContain('@maxItems 5');
    expect(out).toContain('@uniqueItems');
    // No value after @uniqueItems — it's a presence-only tag.
    expect(out).not.toContain('@uniqueItems true');
  });

  it('renders @exclusiveMinimum / @exclusiveMaximum in numeric form', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Volume', {
            kind: 'scalar',
            scalar: 'number',
            metadata: { exclusiveMinimum: 0, exclusiveMaximum: 1000 },
          }),
        ],
      })
    );
    expect(out).toContain('@exclusiveMinimum 0');
    expect(out).toContain('@exclusiveMaximum 1000');
  });

  it('renders @deprecated as a presence-only tag', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Old', {
            kind: 'scalar',
            scalar: 'string',
            metadata: { deprecated: true },
          }),
        ],
      })
    );
    expect(out).toContain('@deprecated');
    expect(out).not.toContain('@deprecated true');
  });

  it('combines description text and tags in the same JSDoc block', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Limit', {
            kind: 'scalar',
            scalar: 'integer',
            description: 'Page size.',
            metadata: { minimum: 1, maximum: 100 },
          }),
        ],
      })
    );
    // Description first, then tag lines.
    expect(out).toMatch(/\*\s*Page size\.\s*\n\s*\*\s*@minimum 1\s*\n\s*\*\s*@maximum 100/);
  });

  it('renders metadata above inline object properties', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [
        {
          name: 'name',
          required: true,
          description: 'Display name.',
          schema: {
            kind: 'scalar',
            scalar: 'string',
            metadata: { minLength: 1, maxLength: 50, pattern: '^[A-Z]+$' },
          },
        },
      ],
    });
    // Multi-line JSDoc with description then tags, immediately above the prop line.
    expect(got).toMatch(/\* Display name\./);
    expect(got).toMatch(/\* @minLength 1/);
    expect(got).toMatch(/\* @maxLength 50/);
    expect(got).toMatch(/\* @pattern \^\[A-Z\]\+\$/);
    expect(got).toContain('name: string;');
  });

  it('omits the JSDoc block when there is neither description nor metadata', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [{ name: 'a', schema: SCALAR, required: true }],
    });
    expect(got).not.toContain('/**');
  });

  it('emits a JSDoc block when metadata exists even without a description', () => {
    const got = renderSchema({
      kind: 'object',
      properties: [
        {
          name: 'page',
          required: true,
          schema: {
            kind: 'scalar',
            scalar: 'integer',
            metadata: { minimum: 1 },
          },
        },
      ],
    });
    expect(got).toMatch(/\/\*\*\n {5}\* @minimum 1\n {5}\*\/\n {4}page: number;/);
  });

  it('escapes `*/` inside pattern strings so it cannot terminate the JSDoc block', () => {
    // Defensive guard: a regex pattern of `^a*/b$` would otherwise break the comment.
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Tricky', {
            kind: 'scalar',
            scalar: 'string',
            metadata: { pattern: '^a*/b$' },
          }),
        ],
      })
    );
    expect(out).toContain('@pattern ^a*\\/b$');
    expect(out).not.toContain('@pattern ^a*/b$');
  });

  it('does not emit a JSDoc block when metadata bag is present but empty', () => {
    // We never produce `{}` from the builder, but harden the renderer anyway.
    const got = renderSchema({
      kind: 'object',
      properties: [{ name: 'a', schema: { ...SCALAR, metadata: {} }, required: true }],
    });
    expect(got).not.toContain('/**');
  });
});

describe('dateType knob (string → Date for date formats)', () => {
  const dateTime = (): SchemaModel => ({
    kind: 'scalar',
    scalar: 'string',
    metadata: { format: 'date-time' },
  });

  it('emits Date for a date-time string scalar under dateType "Date"', () => {
    expect(renderSchema(dateTime(), 'Date')).toBe('Date');
  });

  it('emits Date for a date string scalar under dateType "Date"', () => {
    expect(
      renderSchema({ kind: 'scalar', scalar: 'string', metadata: { format: 'date' } }, 'Date')
    ).toBe('Date');
  });

  it('keeps string for date-time under dateType "string"', () => {
    expect(renderSchema(dateTime(), 'string')).toBe('string');
  });

  it('keeps string for date-time by default (omitted dateType — byte-identical)', () => {
    expect(renderSchema(dateTime())).toBe('string');
  });

  it('keeps string for a non-date string format regardless of dateType', () => {
    const email: SchemaModel = { kind: 'scalar', scalar: 'string', metadata: { format: 'email' } };
    expect(renderSchema(email, 'Date')).toBe('string');
  });

  it('leaves non-string scalars unaffected under dateType "Date"', () => {
    expect(renderSchema({ kind: 'scalar', scalar: 'integer' }, 'Date')).toBe('number');
  });

  it('threads Date into nested object properties and arrays under "Date"', () => {
    const out = renderSchema(
      {
        kind: 'object',
        properties: [
          { name: 'createdAt', schema: dateTime(), required: true },
          { name: 'days', schema: { kind: 'array', items: dateTime() }, required: false },
        ],
      },
      'Date'
    );
    expect(out).toContain('createdAt: Date;');
    expect(out).toContain('days?: Date[];');
  });

  it('emits Date in the named-schema alias body under emitOptions dateType "Date"', () => {
    const out = emitPackage(apiModel({ schemas: [namedSchema('Created', dateTime())] }), {
      dateType: 'Date',
    });
    expect(out).toContain('export type Created = Date;');
  });

  it('leaves the named-schema alias as string by default', () => {
    const out = emitPackage(apiModel({ schemas: [namedSchema('Created', dateTime())] }));
    expect(out).toContain('export type Created = string;');
  });

  it('defaults schemaToTypeNode dateType to string (called with one arg)', () => {
    expect(printNodes([schemaToTypeNode(dateTime())])).toBe('string');
  });

  it('defaults typesStatements dateType to string (called without it)', () => {
    const out = printNodes(typesStatements([namedSchema('Created', dateTime())]));
    expect(out).toContain('export type Created = string;');
  });
});

describe('enum style — const-object companion (C6.2)', () => {
  const orderStatus = namedSchema('OrderStatus', {
    kind: 'enum',
    scalar: 'string',
    values: ['placed', 'completed'],
  });

  it('emits a const-object companion for named string enums by default', () => {
    const out = emitPackage(apiModel({ schemas: [orderStatus] }));
    expect(out).toContain('export type OrderStatus = "placed" | "completed";');
    expect(out).toContain('export const OrderStatus = {');
    expect(out).toContain('placed: "placed",');
    expect(out).toContain('completed: "completed"');
    expect(out).toContain('} as const;');
  });

  it('does not emit a const object for integer enums', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Code', {
            kind: 'enum',
            scalar: 'integer',
            values: [1, 2],
          }),
        ],
      })
    );
    expect(out).toContain('export type Code = 1 | 2;');
    expect(out).not.toContain('export const Code');
  });

  it('does not emit a const object for boolean enums', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Flag', {
            kind: 'enum',
            scalar: 'boolean',
            values: [true, false],
          }),
        ],
      })
    );
    expect(out).not.toContain('export const Flag');
  });

  it('skips the const object when any value is not a valid identifier', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Scope', {
            kind: 'enum',
            scalar: 'string',
            values: ['menu:read', 'menuWrite'],
          }),
        ],
      })
    );
    expect(out).toContain('export type Scope = "menu:read" | "menuWrite";');
    expect(out).not.toContain('export const Scope');
  });

  it('skips the const object for a string-scalar enum that contains a non-string value', () => {
    // scalarForEnumValues can return 'string' for a mixed enum; the const-object
    // path must still bail when a value isn't actually a string.
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Mixed', {
            kind: 'enum',
            scalar: 'string',
            values: ['a', 1],
          }),
        ],
      })
    );
    expect(out).not.toContain('export const Mixed');
  });
});
