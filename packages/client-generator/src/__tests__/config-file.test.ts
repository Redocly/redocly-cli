import { mergeConfig } from '../config-file.js';

describe('mergeConfig', () => {
  it('CLI overrides win over base values; undefined overrides are ignored', () => {
    const merged = mergeConfig(
      { api: 'spec.yaml', output: 'a.ts', outputMode: 'single' },
      { output: 'b.ts', outputMode: undefined, argsStyle: 'grouped' }
    );
    expect(merged).toEqual({
      api: 'spec.yaml',
      output: 'b.ts',
      outputMode: 'single',
      argsStyle: 'grouped',
    });
  });

  it('layers a partial pagination override onto the shared convention instead of replacing it', () => {
    const merged = mergeConfig(
      {
        pagination: {
          style: 'cursor',
          cursorParam: 'cursor',
          items: '/items',
          operations: { listA: { style: 'cursor', cursorParam: 'a', items: '/a' } },
        },
      },
      {
        pagination: {
          limitParam: 'perPage',
          operations: { listB: { style: 'offset', offsetParam: 'b', items: '/b' } },
        },
      }
    );
    expect(merged.pagination).toEqual({
      style: 'cursor',
      cursorParam: 'cursor',
      items: '/items',
      limitParam: 'perPage',
      operations: {
        listA: { style: 'cursor', cursorParam: 'a', items: '/a' },
        listB: { style: 'offset', offsetParam: 'b', items: '/b' },
      },
    });
  });
});
