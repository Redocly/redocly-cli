import { classifyChanges } from '../classify/index.js';
import { UsageIndex } from '../classify/usage.js';
import type { NodeEntry, RawChange } from '../types.js';

const emptyMaps = {
  base: new Map<string, NodeEntry>(),
  revision: new Map<string, NodeEntry>(),
  usage: new UsageIndex([]),
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
    expect(change.ruleIds).toEqual(['operation-removed']);
    expect(change.message).toBeDefined();
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
    expect(change.ruleIds).toEqual(['path-removed']);
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
    expect(change.ruleIds).toBeUndefined();
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
});
