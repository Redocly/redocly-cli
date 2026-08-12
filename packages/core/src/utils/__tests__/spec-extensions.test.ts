import { getTypes } from '../../oas-types.js';
import { normalizeTypes, SpecExtension } from '../../types/index.js';
import type { SpecVendorExtensionsAccumulator } from '../../typings/common.js';
import { collectSpecExtension, ensureSpecExtensionDispatch } from '../spec-extensions.js';

function collectFrom(extensions: Record<string, unknown>): SpecVendorExtensionsAccumulator {
  const collected: SpecVendorExtensionsAccumulator = {};
  for (const [key, value] of Object.entries(extensions)) {
    collectSpecExtension(collected, key, value);
  }
  return collected;
}

const props = (acc: SpecVendorExtensionsAccumulator, name: string, prop: string) =>
  [...(acc[name]?.props[prop] ?? [])].sort();

describe('ensureSpecExtensionDispatch', () => {
  it('should free typed x- keys for dispatch while keeping structural ones typed', () => {
    const types = normalizeTypes(getTypes('oas3_0'));

    ensureSpecExtensionDispatch(types);

    expect(types.Paths.extensionsPrefix).toBe('x-');
    expect(types.Operation.properties['x-codeSamples']).toBeUndefined();
    expect(types.Root.properties['x-webhooks']).toBeDefined();
    expect(types.PathItem.properties['x-query']).toBeDefined();
  });

  it('should route x- keys past an untyped catch-all, leaving other keys to it', () => {
    const types = normalizeTypes(getTypes('async2'));

    ensureSpecExtensionDispatch(types);

    const resolveEntry = types.Message.additionalProperties as (
      value: unknown,
      key: string
    ) => unknown;
    expect(resolveEntry({}, 'x-custom')).toBe(SpecExtension);
    expect(resolveEntry({}, 'contentType')).not.toBe(SpecExtension);
  });
});

describe('stats vendor extensions value sampling', () => {
  it('should keep short scalars but replace long strings with a length marker', () => {
    const acc = collectFrom({ 'x-short': 'hello', 'x-long': 'x'.repeat(80) });

    expect(props(acc, 'x-short', '$value')).toEqual(['hello']);
    expect(props(acc, 'x-long', '$value')).toEqual(['<string:80>']);
  });

  it('should collect the extension value under $value when it has no own props', () => {
    const acc = collectFrom({ 'x-flag': true });

    expect(props(acc, 'x-flag', '$value')).toEqual(['true']);
  });

  it('should mark a $ref value as <ref> and an object or array as its type', () => {
    const acc = collectFrom({
      'x-codeSamples': [{ lang: 'curl', source: { $ref: '#/x' } }],
      'x-shapes': { nested: { a: 1 }, list: [1, 2, 3] },
    });

    expect(props(acc, 'x-codeSamples', 'lang')).toEqual(['curl']);
    expect(props(acc, 'x-codeSamples', 'source')).toEqual(['<ref>']);
    expect(props(acc, 'x-shapes', 'nested')).toEqual(['<object>']);
    expect(props(acc, 'x-shapes', 'list')).toEqual(['<array:3>']);
  });

  it('should mask sensitive values by key and by value shape, keeping benign ones', () => {
    const acc = collectFrom({
      'x-auth-token': 'benign-but-key-is-sensitive',
      'x-gateway': {
        apiKey: 'abc123',
        authorization: 'Basic abc',
        url: 'https://internal.corp/api',
        contact: 'jane.doe@corp.com',
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        color: 'purple',
      },
    });

    expect(props(acc, 'x-auth-token', '$value')).toEqual(['<masked>']);
    expect(props(acc, 'x-gateway', 'apiKey')).toEqual(['<masked>']);
    expect(props(acc, 'x-gateway', 'authorization')).toEqual(['<masked>']);
    expect(props(acc, 'x-gateway', 'url')).toEqual(['<masked>']);
    expect(props(acc, 'x-gateway', 'contact')).toEqual(['<masked>']);
    expect(props(acc, 'x-gateway', 'traceId')).toEqual(['<masked>']);
    expect(props(acc, 'x-gateway', 'color')).toEqual(['purple']);
  });

  it('should cap distinct values per prop at 20 and mark the overflow as <truncated>', () => {
    const badges = Array.from({ length: 25 }, (_, index) => ({ color: `c${index}` }));
    const acc = collectFrom({ 'x-badges': badges });

    const values = acc['x-badges'].props.color;
    expect(values.size).toBe(21);
    expect(values.has('c0')).toBe(true);
    expect(values.has('<truncated>')).toBe(true);
  });

  it('should cap distinct props per extension at 20 and fold the rest under <truncated>', () => {
    const metadata = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => [`k${index}`, `v${index}`])
    );
    const acc = collectFrom({ 'x-metadata': metadata });

    const propNames = Object.keys(acc['x-metadata'].props);
    expect(propNames).toHaveLength(21);
    expect(propNames).toContain('<truncated>');
  });
});
