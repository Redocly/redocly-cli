import { describe, it, expect } from 'vitest';

import { MARKDOC_REALM_SCHEMA } from '../../../data/markdoc-realm-schema.js';
import { resolveMarkdocConfig, selfClosingTagNames, type MarkdocSchema } from '../schema.js';

describe('resolveMarkdocConfig', () => {
  it('undefined normalizes to disabled with no schema', () => {
    expect(resolveMarkdocConfig(undefined)).toEqual({ enabled: false, schema: null });
  });
  it('false normalizes to disabled with no schema (boolean shorthand)', () => {
    expect(resolveMarkdocConfig(false)).toEqual({ enabled: false, schema: null });
  });
  it('true resolves to enabled + the built-in realm schema', () => {
    const result = resolveMarkdocConfig(true);
    expect(result.enabled).toBe(true);
    expect(result.schema).toBe(MARKDOC_REALM_SCHEMA);
  });
  it('{ schema: "realm" } is equivalent to true with no extend', () => {
    const result = resolveMarkdocConfig({ schema: 'realm' });
    expect(result.enabled).toBe(true);
    expect(result.schema).toBe(MARKDOC_REALM_SCHEMA);
  });
  it('{ schema: false } stays enabled (parsing/pairing) but has no schema', () => {
    expect(resolveMarkdocConfig({ schema: false })).toEqual({ enabled: true, schema: null });
  });
  it('{ schema: false, extend } ignores extend -- no base to extend', () => {
    const result = resolveMarkdocConfig({
      schema: false,
      extend: { tags: { widget: { selfClosing: true } } },
    });
    expect(result).toEqual({ enabled: true, schema: null });
  });
  it('extend.tags merges over the realm base, adding a new tag', () => {
    const result = resolveMarkdocConfig({
      schema: 'realm',
      extend: { tags: { widget: { selfClosing: true } } },
    });
    expect(result.enabled).toBe(true);
    expect(result.schema?.tags['widget']).toEqual({ selfClosing: true });
    expect(result.schema?.tags['admonition']).toBe(MARKDOC_REALM_SCHEMA.tags['admonition']);
  });
  it('extend.tags overrides a colliding built-in tag name wholesale', () => {
    const result = resolveMarkdocConfig({
      schema: 'realm',
      extend: { tags: { icon: { attributes: { name: { type: 'string', required: true } } } } },
    });
    // Whole-tag replace: the built-in `icon`'s `selfClosing: true` is
    // dropped, not merged with the new attributes.
    expect(result.schema?.tags['icon']).toEqual({
      attributes: { name: { type: 'string', required: true } },
    });
  });
  it('a malformed object shape defensively normalizes to disabled', () => {
    // Config validation already rejects this shape earlier; this function
    // only has to not throw if one slips through.
    expect(resolveMarkdocConfig({ schema: 'bogus' } as any)).toEqual({
      enabled: false,
      schema: null,
    });
  });
});

describe('selfClosingTagNames', () => {
  it('collects every tag with selfClosing: true from a schema', () => {
    const schema: MarkdocSchema = {
      tags: {
        a: { selfClosing: true },
        b: { selfClosing: false },
        c: {},
        d: { selfClosing: true, attributes: { x: { type: 'string' } } },
      },
    };
    expect(selfClosingTagNames(schema)).toEqual(new Set(['a', 'd']));
  });
  it('matches the real realm schema: partial/img/icon and friends', () => {
    const names = selfClosingTagNames(MARKDOC_REALM_SCHEMA);
    for (const name of ['partial', 'img', 'icon', 'code-snippet', 'diagram']) {
      expect(names.has(name)).toBe(true);
    }
    expect(names.has('admonition')).toBe(false);
  });
});
