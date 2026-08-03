import type { NamedSchemaModel } from '../../intermediate-representation/model.js';
import { printStatements } from '../ts.js';
import { renderTypeGuards, typeGuardStatements } from '../type-guards.js';

// Printer equivalence across the guard vocabulary: explicit discriminators,
// implicit (shared const property), nested unions, multi-value mappings.
const SCHEMAS: NamedSchemaModel[] = [
  { name: 'Beverage', schema: { kind: 'object', properties: [] } },
  { name: 'Dessert', schema: { kind: 'object', properties: [] } },
  {
    name: 'MenuItem',
    schema: {
      kind: 'union',
      members: [
        { kind: 'ref', name: 'Beverage' },
        { kind: 'ref', name: 'Dessert' },
      ],
      discriminator: {
        propertyName: 'category',
        mapping: [
          { value: 'beverage', schemaName: 'Beverage' },
          { value: 'iced-beverage', schemaName: 'Beverage' },
          { value: 'dessert', schemaName: 'Dessert' },
        ],
      },
    },
  },
  {
    name: 'Ok',
    schema: {
      kind: 'object',
      properties: [{ name: 'status', schema: { kind: 'literal', value: 'ok' }, required: true }],
    },
  },
  {
    name: 'Failed',
    schema: {
      kind: 'object',
      properties: [
        { name: 'status', schema: { kind: 'literal', value: 'failed' }, required: true },
      ],
    },
  },
  {
    // Implicit discriminator, nested inside an array property.
    name: 'BulkResponse',
    schema: {
      kind: 'object',
      properties: [
        {
          name: 'results',
          schema: {
            kind: 'array',
            items: {
              kind: 'union',
              members: [
                { kind: 'ref', name: 'Ok' },
                { kind: 'ref', name: 'Failed' },
              ],
            },
          },
          required: true,
        },
      ],
    },
  },
] as unknown as NamedSchemaModel[];

describe('renderTypeGuards matches printStatements(typeGuardStatements(…))', () => {
  it('explicit + implicit + nested + multi-value mappings', () => {
    expect(renderTypeGuards(SCHEMAS)).toBe(printStatements(typeGuardStatements(SCHEMAS)));
  });

  it('no guardable unions renders empty', () => {
    const plain: NamedSchemaModel[] = [
      { name: 'Order', schema: { kind: 'object', properties: [] } },
    ] as unknown as NamedSchemaModel[];
    expect(renderTypeGuards(plain)).toBe('');
  });
});
