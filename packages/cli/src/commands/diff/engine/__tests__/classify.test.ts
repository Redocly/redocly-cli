import { classifyChanges } from '../classify/index.js';
import { UsageIndex } from '../classify/usage.js';
import type { NodeEntry, RawChange } from '../types.js';
import { treeOf } from './tree.js';

const emptyMaps = {
  base: new Map<string, NodeEntry>(),
  revision: new Map<string, NodeEntry>(),
  usage: new UsageIndex([], () => undefined),
};

describe('classifyChanges', () => {
  it('classifies operation removal as breaking', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/paths/~1pets/get',
        kind: 'removed',
        typeName: 'Operation',
        base: { pointer: '#/paths/~1pets/get', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_1', ...emptyMaps });
    expect(change.compat).toBe('breaking');
    expect(change.verdicts).toEqual([
      { ruleId: 'operation-removed', compat: 'breaking', message: 'Operation was removed.' },
    ]);
  });

  it('classifies path removal as breaking', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/paths/~1pets',
        kind: 'removed',
        typeName: 'PathItem',
        base: { pointer: '#/paths/~1pets', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_0', ...emptyMaps });
    expect(change.compat).toBe('breaking');
    expect(change.verdicts).toEqual([
      { ruleId: 'path-removed', compat: 'breaking', message: 'Path was removed.' },
    ]);
  });

  it('defaults to non-breaking when no rule judges the change', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/info',
        property: 'title',
        kind: 'changed',
        typeName: 'Info',
        base: { pointer: '#/info/title', value: 'a' },
        revision: { pointer: '#/info/title', value: 'b' },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_1', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
    expect(change.verdicts).toBeUndefined();
  });

  it('returns structural-only (non-breaking) for specs without a registry', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/x',
        kind: 'removed',
        typeName: 'Operation',
        base: { pointer: '#/x', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'async2', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
  });

  it('added operations are non-breaking', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/paths/~1pets/post',
        kind: 'added',
        typeName: 'Operation',
        revision: { pointer: '#/paths/~1pets/post', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_1', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
  });

  it('keeps every verdict when multiple rules fire, worst-first', () => {
    // The component is referenced from a request and from a response, so it is
    // judged under both polarities; that needs real node types on the way down.
    const entries = treeOf(`
      #/ Root
      #/paths PathsMap
      #/paths/~1x PathItem
      #/paths/~1x/get Operation
      #/paths/~1x/get/parameters ParameterList
      #/paths/~1x/get/parameters/{query:q} Parameter
      #/paths/~1x/get/parameters/{query:q}/schema Schema
      #/paths/~1x/get/responses Responses
      #/paths/~1x/get/responses/200 Response
      #/paths/~1x/get/responses/200/content MediaTypesMap
      #/paths/~1x/get/responses/200/content/application~1json MediaType
      #/paths/~1x/get/responses/200/content/application~1json/schema Schema
      #/components Components
      #/components/schemas NamedSchemas
      #/components/schemas/S Schema
    `);
    const tree = (pointer: string) => entries.get(pointer);
    const usage = new UsageIndex(
      [
        {
          site: '#/paths/~1x/get/parameters/{query:q}/schema',
          target: '#/components/schemas/S',
        },
        {
          site: '#/paths/~1x/get/responses/200/content/application~1json/schema',
          target: '#/components/schemas/S',
        },
      ],
      tree
    );
    const changes: RawChange[] = [
      {
        pointer: '#/components/schemas/S',
        property: 'enum',
        kind: 'changed',
        typeName: 'Schema',
        base: { pointer: '#/components/schemas/S/enum', value: ['a', 'b'] },
        revision: { pointer: '#/components/schemas/S/enum', value: ['a', 'c'] },
      },
    ];
    const [change] = classifyChanges({
      changes,
      specVersion: 'oas3_1',
      base: entries,
      revision: entries,
      usage,
    });
    expect(change.compat).toBe('breaking');
    expect(change.verdicts?.map((v) => v.ruleId)).toEqual([
      'enum-values-added',
      'enum-values-removed',
    ]);
  });
});
