import type { ApiModel, SchemaModel } from '../../../intermediate-representation/model.js';
import { phpType } from '../types.js';

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };

const INT: SchemaModel = { kind: 'scalar', scalar: 'integer' };

function model(schemas: Record<string, SchemaModel>): ApiModel {
  return {
    title: 'Cafe',
    version: '1.0.0',
    services: [],
    schemas: Object.entries(schemas).map(([name, schema]) => ({ name, schema })),
    securitySchemes: [],
  } as unknown as ApiModel;
}

describe('phpType — unions', () => {
  const ENUM: SchemaModel = { kind: 'enum', values: ['a', 'b'], scalar: 'string' };
  const base = model({
    Kind: ENUM,
    Order: { kind: 'object', properties: [] },
  });

  it('renders a union of expressible members as a native PHP 8.1 union', () => {
    expect(phpType({ kind: 'union', members: [STRING, INT] }, base)).toBe('string|int');
    expect(
      phpType(
        {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Kind' },
            { kind: 'array', items: STRING },
          ],
        },
        base
      )
    ).toBe('Kind|array');
    // A class member keeps its class name.
    expect(
      phpType({ kind: 'union', members: [{ kind: 'ref', name: 'Order' }, STRING] }, base)
    ).toBe('Order|string');
  });

  it('expresses nullability as |null inside a union — PHP forbids mixing ? with |', () => {
    const type = phpType({ kind: 'union', members: [STRING, INT, { kind: 'null' }] }, base);
    expect(type).toBe('string|int|null');
    expect(type.startsWith('?')).toBe(false);
    // A single nullable type keeps the shorthand.
    expect(phpType({ kind: 'union', members: [STRING, { kind: 'null' }] }, base)).toBe('?string');
  });

  it('falls back to mixed when a member has no PHP type — mixed cannot be a union member', () => {
    const withInlineObject: SchemaModel = {
      kind: 'union',
      members: [STRING, { kind: 'object', properties: [] }],
    };
    expect(phpType(withInlineObject, base)).toBe('mixed');
    expect(phpType({ kind: 'union', members: [STRING, { kind: 'unknown' }] }, base)).toBe('mixed');
  });

  it('deduplicates members that map to the same PHP type', () => {
    expect(phpType({ kind: 'union', members: [STRING, ENUM] }, base)).toBe('string');
  });
});
