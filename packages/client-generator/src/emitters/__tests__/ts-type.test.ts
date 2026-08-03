import type { NamedSchemaModel, SchemaModel } from '../../intermediate-representation/model.js';
import { renderTypeAliases, tsType } from '../ts-type.js';

// Literal expectations for the TS type renderer — the formatting contract every
// generated client's types follow (4-space indent, double quotes, parenthesized
// compound members). The full surface is additionally pinned by the assembly goldens.

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };
const INT: SchemaModel = { kind: 'scalar', scalar: 'integer' };

describe('tsType', () => {
  it.each<[string, SchemaModel, string]>([
    ['scalars', INT, 'number'],
    ['binary → Blob', { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } }, 'Blob'],
    ['ref', { kind: 'ref', name: 'Order' }, 'Order'],
    ['literal', { kind: 'literal', value: 'fixed' }, '"fixed"'],
    ['enum', { kind: 'enum', values: ['a', 'b'], scalar: 'string' }, '"a" | "b"'],
    ['array of ref', { kind: 'array', items: { kind: 'ref', name: 'Order' } }, 'Order[]'],
    [
      'array of union (parenthesized)',
      { kind: 'array', items: { kind: 'union', members: [STRING, { kind: 'null' }] } },
      '(string | null)[]',
    ],
    [
      'nullable enum (the OAS 3.1 shape, parenthesized)',
      {
        kind: 'union',
        members: [
          { kind: 'enum', values: ['active', 'archived'], scalar: 'string' },
          { kind: 'null' },
        ],
      },
      '("active" | "archived") | null',
    ],
    ['record', { kind: 'record', value: STRING }, 'Record<string, string>'],
    ['omit', { kind: 'omit', base: 'Pet', keys: ['id'] }, 'Omit<Pet, "id">'],
    [
      'intersection with parenthesized union member',
      {
        kind: 'intersection',
        members: [
          { kind: 'ref', name: 'Base' },
          { kind: 'union', members: [STRING, INT] },
        ],
      },
      'Base & (string | number)',
    ],
    ['empty object', { kind: 'object', properties: [] }, '{}'],
  ])('%s', (_label, schema, expected) => {
    expect(tsType(schema)).toBe(expected);
  });

  it('renders objects multiline with JSDoc, readonly, optional, and quoted keys', () => {
    const schema: SchemaModel = {
      kind: 'object',
      properties: [
        { name: 'id', schema: STRING, required: true, readOnly: true },
        { name: 'note', schema: STRING, required: false, description: 'Free-form note.' },
        { name: 'weird-name', schema: INT, required: true },
      ],
    };
    expect(tsType(schema)).toBe(
      [
        '{',
        '    readonly id: string;',
        '    /**',
        '     * Free-form note.',
        '     */',
        '    note?: string;',
        '    "weird-name": number;',
        '}',
      ].join('\n')
    );
  });

  it('under dateType Date, date-formatted strings become Date', () => {
    const schema: SchemaModel = {
      kind: 'scalar',
      scalar: 'string',
      metadata: { format: 'date-time' },
    };
    expect(tsType(schema, 'Date')).toBe('Date');
    expect(tsType(schema, 'string')).toBe('string');
  });
});

describe('renderTypeAliases', () => {
  it('emits aliases with JSDoc and identifier-safe enum const companions', () => {
    const schemas: NamedSchemaModel[] = [
      { name: 'Status', schema: { kind: 'enum', values: ['open', 'closed'], scalar: 'string' } },
      {
        // `menu:read` is not a valid identifier — no const companion.
        name: 'Scopes',
        schema: { kind: 'enum', values: ['menu:read'], scalar: 'string' },
      },
    ] as NamedSchemaModel[];
    expect(renderTypeAliases(schemas)).toBe(
      [
        'export type Status = "open" | "closed";',
        '',
        'export const Status = {',
        '    open: "open",',
        '    closed: "closed"',
        '} as const;',
        '',
        'export type Scopes = "menu:read";',
      ].join('\n')
    );
  });
});
