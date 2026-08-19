import type { Schema } from '../../../commands/coverage/engine/schema.js';
import { collectSites, siteKey } from '../../../commands/coverage/engine/sites.js';

describe('siteKey', () => {
  it('omits the separator at the root of a schema', () => {
    expect(siteKey('Thing', '', 'oneOf')).toBe('Thing#oneOf');
  });

  it('joins the owner and the property path', () => {
    expect(siteKey('Thing', 'a.b', 'anyOf')).toBe('Thing.a.b#anyOf');
  });
});

describe('collectSites', () => {
  it('finds a union nested under a property', () => {
    const schema: Schema = {
      type: 'object',
      properties: { choice: { oneOf: [{ type: 'string' }, { type: 'integer' }] } },
    };

    expect([...collectSites(schema, 'Holder').values()]).toEqual([
      { owner: 'Holder', path: 'choice', keyword: 'oneOf', count: 2 },
    ]);
  });

  it('attributes a union inside array items to the array own path', () => {
    const schema: Schema = {
      type: 'object',
      properties: {
        list: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'integer' }] } },
      },
    };

    expect([...collectSites(schema, 'Holder').keys()]).toEqual(['Holder.list#anyOf']);
  });

  it('finds a union under additionalProperties', () => {
    const schema: Schema = {
      type: 'object',
      additionalProperties: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
    };

    expect([...collectSites(schema, 'Holder').keys()]).toEqual(['Holder#oneOf']);
  });

  it('descends through allOf without recording it as a variant', () => {
    const schema: Schema = {
      allOf: [{ type: 'object', properties: { a: { oneOf: [{ type: 'string' }, {}] } } }],
    };

    expect([...collectSites(schema, 'Holder').keys()]).toEqual(['Holder.a#oneOf']);
  });

  it('stops at a $ref, leaving that schema to be enumerated under its own name', () => {
    const outer: Schema = {
      type: 'object',
      properties: { inner: { $ref: '#/components/schemas/Inner' } },
    };

    expect(collectSites(outer, 'Outer').size).toBe(0);
  });

  it('finds nothing in a schema with no union at all', () => {
    expect(collectSites({ type: 'object', properties: { a: { type: 'string' } } }, 'Plain').size).toBe(
      0
    );
  });
});
