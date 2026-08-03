import type { NamedSchemaModel, SchemaModel } from '../../intermediate-representation/model.js';
import { renderTypeAliases, tsType } from '../ts-type.js';
import { printStatements } from '../ts.js';
import { renderSchema, typesStatements, type DateType } from '../types.js';

// The text renderer replaces the AST printer; while both exist, equivalence is
// asserted against the printer's OWN output across the whole schema vocabulary —
// printer fidelity by construction, so downstream snapshots don't churn per-type.

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };
const INT: SchemaModel = { kind: 'scalar', scalar: 'integer' };
const BOOL: SchemaModel = { kind: 'scalar', scalar: 'boolean' };

const CASES: Array<[string, SchemaModel, DateType?]> = [
  ['string', STRING],
  ['number', { kind: 'scalar', scalar: 'number' }],
  ['integer', INT],
  ['boolean', BOOL],
  ['binary → Blob', { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } }],
  ['date kept as string', { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } }],
  ['date as Date', { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } }, 'Date'],
  ['ref', { kind: 'ref', name: 'Order' }],
  ['string literal', { kind: 'literal', value: 'fixed' }],
  ['number literal', { kind: 'literal', value: 42 }],
  ['boolean literal', { kind: 'literal', value: true }],
  ['single-value enum', { kind: 'enum', values: ['only'], scalar: 'string' }],
  ['string enum', { kind: 'enum', values: ['a', 'b'], scalar: 'string' }],
  ['integer enum', { kind: 'enum', values: [1, 2], scalar: 'integer' }],
  ['null', { kind: 'null' }],
  ['unknown', { kind: 'unknown' }],
  ['array of scalar', { kind: 'array', items: STRING }],
  [
    'array of union (parenthesized)',
    { kind: 'array', items: { kind: 'union', members: [STRING, { kind: 'null' }] } },
  ],
  [
    'array of multi enum (parenthesized)',
    { kind: 'array', items: { kind: 'enum', values: ['a', 'b'], scalar: 'string' } },
  ],
  ['array of ref', { kind: 'array', items: { kind: 'ref', name: 'Order' } }],
  ['record', { kind: 'record', value: { kind: 'union', members: [STRING, INT] } }],
  ['empty object', { kind: 'object', properties: [] }],
  [
    'object with the full property vocabulary',
    {
      kind: 'object',
      properties: [
        { name: 'id', schema: STRING, required: true, readOnly: true },
        {
          name: 'note',
          schema: STRING,
          required: false,
          description: 'Free-form note.\nSecond line.',
        },
        { name: 'weird-name', schema: INT, required: true },
        {
          name: 'limit',
          schema: { kind: 'scalar', scalar: 'integer', metadata: { minimum: 1, maximum: 100 } },
          required: false,
        },
        {
          name: 'nested',
          schema: {
            kind: 'object',
            properties: [{ name: 'deep', schema: BOOL, required: false }],
          },
          required: true,
        },
      ],
    },
  ],
  [
    'union with object member',
    {
      kind: 'union',
      members: [
        { kind: 'object', properties: [{ name: 'a', schema: STRING, required: true }] },
        { kind: 'null' },
      ],
    },
  ],
  [
    'intersection with union member (parenthesized)',
    {
      kind: 'intersection',
      members: [
        { kind: 'ref', name: 'Base' },
        { kind: 'union', members: [STRING, INT] },
      ],
    },
  ],
  ['omit', { kind: 'omit', base: 'Pet', keys: ['id', 'createdAt'] }],
];

describe('tsType matches the AST printer for every schema shape', () => {
  it.each(CASES)('%s', (_label, schema, dateType) => {
    expect(tsType(schema, dateType ?? 'string')).toBe(renderSchema(schema, dateType ?? 'string'));
  });
});

describe('renderTypeAliases matches printStatements(typesStatements(…))', () => {
  it('aliases with JSDoc, enum const companions, and quoted-value enums', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Status',
        schema: { kind: 'enum', values: ['open', 'closed'], scalar: 'string' },
      },
      {
        name: 'Scopes',
        // `menu:read` is not a valid identifier — no const companion.
        schema: { kind: 'enum', values: ['menu:read', 'menu:write'], scalar: 'string' },
      },
      {
        name: 'Order',
        schema: {
          kind: 'object',
          description: 'One placed order.',
          metadata: { deprecated: true },
          properties: [{ name: 'id', schema: STRING, required: true }],
        },
      },
      {
        name: 'Page',
        schema: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'Base' },
            {
              kind: 'object',
              properties: [
                {
                  name: 'items',
                  schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
                  required: true,
                },
              ],
            },
          ],
        },
      },
    ];
    expect(renderTypeAliases(schemas, 'string')).toBe(
      printStatements(typesStatements(schemas, 'string'))
    );
  });
});
