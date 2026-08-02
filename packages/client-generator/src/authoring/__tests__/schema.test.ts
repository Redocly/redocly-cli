import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import {
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  isNullable,
  unwrapNullable,
} from '../schema.js';

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };

function model(schemas: Record<string, SchemaModel>): ApiModel {
  return {
    title: 't',
    version: '1',
    services: [],
    schemas: Object.entries(schemas).map(([name, schema]) => ({ name, schema })),
    securitySchemes: [],
  } as unknown as ApiModel;
}

describe('flattenAllOf', () => {
  it('merges intersection members across refs; later members win on property conflicts', () => {
    const collection: SchemaModel = {
      kind: 'object',
      properties: [
        { name: 'offset', schema: { kind: 'scalar', scalar: 'integer' }, required: false },
        { name: 'kind', schema: STRING, required: false },
      ],
    };
    const listPage: SchemaModel = {
      kind: 'intersection',
      members: [
        { kind: 'ref', name: 'Collection' },
        {
          kind: 'object',
          properties: [
            { name: 'items', schema: { kind: 'array', items: STRING }, required: true },
            { name: 'kind', schema: { kind: 'literal', value: 'list' }, required: true },
          ],
        },
      ],
    };
    const flat = flattenAllOf(listPage, model({ Collection: collection }))!;
    const names = flat.properties.map((property) => property.name);
    expect(names).toEqual(['offset', 'kind', 'items']);
    const kind = flat.properties.find((property) => property.name === 'kind')!;
    expect(kind.schema).toEqual({ kind: 'literal', value: 'list' });
    expect(kind.required).toBe(true);
  });

  it('flattens a plain object and nested intersections; bails to undefined on a scalar member', () => {
    const object: SchemaModel = { kind: 'object', properties: [] };
    expect(flattenAllOf(object, model({}))).toEqual({ properties: [], description: undefined });
    const withScalar: SchemaModel = { kind: 'intersection', members: [object, STRING] };
    expect(flattenAllOf(withScalar, model({}))).toBeUndefined();
    const nested: SchemaModel = {
      kind: 'intersection',
      members: [{ kind: 'intersection', members: [object] }],
    };
    expect(flattenAllOf(nested, model({}))).toEqual({ properties: [], description: undefined });
  });
});

describe('discriminatorCases', () => {
  it('returns the neutral dispatch table with each case schema resolved', () => {
    const cat: SchemaModel = { kind: 'object', properties: [] };
    const union: SchemaModel = {
      kind: 'union',
      members: [{ kind: 'ref', name: 'Cat' }],
      discriminator: { propertyName: 'petType', mapping: [{ value: 'cat', schemaName: 'Cat' }] },
    };
    expect(discriminatorCases(union, model({ Cat: cat }))).toEqual({
      property: 'petType',
      cases: [{ value: 'cat', schemaName: 'Cat', schema: cat }],
    });
    expect(discriminatorCases({ kind: 'union', members: [] }, model({}))).toBeUndefined();
  });
});

describe('nullability and enums', () => {
  it('detects and strips null union members', () => {
    const nullable: SchemaModel = { kind: 'union', members: [STRING, { kind: 'null' }] };
    expect(isNullable(nullable)).toBe(true);
    expect(unwrapNullable(nullable)).toEqual(STRING);
    expect(isNullable(STRING)).toBe(false);
    expect(unwrapNullable(STRING)).toBe(STRING);
  });

  it('extracts enum values with SCREAMING member-name suggestions', () => {
    const status: SchemaModel = {
      kind: 'enum',
      values: ['in-progress', 'done', 404],
      scalar: 'string',
    };
    expect(enumValues(status)).toEqual({
      values: ['in-progress', 'done', 404],
      scalar: 'string',
      memberNames: ['IN_PROGRESS', 'DONE', 'VALUE_404'],
    });
    expect(enumValues(STRING)).toBeUndefined();
  });
});

describe('docText', () => {
  it('normalizes a description into trimmed lines, dropping blank edges', () => {
    expect(docText('  First line.\r\n\r\nSecond.\n')).toEqual(['First line.', '', 'Second.']);
    expect(docText(undefined)).toEqual([]);
  });
});
