import { refTargetChanged } from '../classify/rules/ref-rules.js';
import {
  enumValuesAdded,
  enumValuesRemoved,
  propertyRemovedFromResponse,
  requiredPropertiesAdded,
  requiredPropertiesRemoved,
  schemaTypeChanged,
} from '../classify/rules/schema-rules.js';
import type { NodeEntry, RawChange, RuleContext } from '../types.js';

function ctx(
  polarity: RuleContext['polarity'],
  maps: { base?: Map<string, NodeEntry>; revision?: Map<string, NodeEntry> } = {}
): RuleContext {
  return {
    polarity,
    specVersion: 'oas3_1',
    base: (p) => maps.base?.get(p),
    revision: (p) => maps.revision?.get(p),
  };
}

function propChange(property: string, before: unknown, after: unknown): RawChange {
  return {
    pointer: '#/components/schemas/Pet',
    property,
    kind: 'changed',
    typeName: 'Schema',
    base: { pointer: `#/components/schemas/Pet/${property}`, value: before },
    revision: { pointer: `#/components/schemas/Pet/${property}`, value: after },
  };
}

describe('schema rules', () => {
  it('schema-type-changed: narrowing breaks requests, widening breaks responses', () => {
    const narrowed = propChange('type', 'number', 'integer');
    expect(schemaTypeChanged.visit(narrowed, ctx('request'))?.compat).toBe('breaking');
    expect(schemaTypeChanged.visit(narrowed, ctx('response'))).toBeUndefined();

    const widened = propChange('type', 'integer', 'number');
    expect(schemaTypeChanged.visit(widened, ctx('request'))).toBeUndefined();
    expect(schemaTypeChanged.visit(widened, ctx('response'))?.compat).toBe('breaking');
  });

  it('enum rules are polarity-mirrored', () => {
    const shrunk = propChange('enum', ['a', 'b'], ['a']);
    expect(enumValuesRemoved.visit(shrunk, ctx('request'))?.compat).toBe('breaking');
    expect(enumValuesRemoved.visit(shrunk, ctx('response'))).toBeUndefined();

    const grew = propChange('enum', ['a'], ['a', 'b']);
    expect(enumValuesAdded.visit(grew, ctx('response'))?.compat).toBe('breaking');
    expect(enumValuesAdded.visit(grew, ctx('request'))).toBeUndefined();
  });

  it('required rules are polarity-mirrored', () => {
    const grew = propChange('required', ['a'], ['a', 'b']);
    expect(requiredPropertiesAdded.visit(grew, ctx('request'))?.compat).toBe('breaking');
    expect(requiredPropertiesAdded.visit(grew, ctx('response'))).toBeUndefined();

    const shrunk = propChange('required', ['a', 'b'], ['a']);
    expect(requiredPropertiesRemoved.visit(shrunk, ctx('response'))?.compat).toBe('breaking');
    expect(requiredPropertiesRemoved.visit(shrunk, ctx('request'))).toBeUndefined();
  });

  it('property-removed-from-response fires only for schema-property nodes in response', () => {
    const change: RawChange = {
      pointer: '#/components/schemas/Pet/properties/name',
      kind: 'removed',
      typeName: 'Schema',
      base: { pointer: '#/components/schemas/Pet/properties/name', value: { type: 'string' } },
    };
    expect(propertyRemovedFromResponse.visit(change, ctx('response'))?.compat).toBe('breaking');
    expect(propertyRemovedFromResponse.visit(change, ctx('request'))).toBeUndefined();

    const notAProperty: RawChange = {
      pointer: '#/components/schemas/Pet/oneOf/0',
      kind: 'removed',
      typeName: 'Schema',
      base: { pointer: '#/components/schemas/Pet/oneOf/0', value: {} },
    };
    expect(propertyRemovedFromResponse.visit(notAProperty, ctx('response'))).toBeUndefined();
  });
});

describe('ref-target-changed', () => {
  it('warns when a ref-valued property is retargeted', () => {
    const pointer = '#/paths/~1p/get/responses/200/content/application~1json';
    const base = new Map<string, NodeEntry>([
      [
        pointer,
        {
          pointer,
          realPointer: pointer,
          parentPointer: null,
          typeName: 'MediaType',
          scalars: {},
          refs: { schema: '#/components/schemas/Pet' },
          raw: {},
        },
      ],
    ]);
    const change: RawChange = {
      pointer,
      property: 'schema',
      kind: 'changed',
      typeName: 'MediaType',
      base: { pointer: `${pointer}/schema`, value: '#/components/schemas/Pet' },
      revision: { pointer: `${pointer}/schema`, value: '#/components/schemas/PetV2' },
    };
    expect(refTargetChanged.visit(change, ctx('response', { base }))?.compat).toBe('warning');
  });

  it('stays silent for ordinary string property changes', () => {
    const change: RawChange = {
      pointer: '#/info',
      property: 'title',
      kind: 'changed',
      typeName: 'Info',
      base: { pointer: '#/info/title', value: 'a' },
      revision: { pointer: '#/info/title', value: 'b' },
    };
    expect(refTargetChanged.visit(change, ctx('neutral'))).toBeUndefined();
  });
});
