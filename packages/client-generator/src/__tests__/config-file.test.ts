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

  it('replaces `pagination` wholesale, like every other key', () => {
    const override = { style: 'offset', offsetParam: 'offset', items: '/rows' } as const;
    const merged = mergeConfig(
      { pagination: { style: 'cursor', cursorParam: 'cursor', items: '/items' } },
      { pagination: override }
    );
    expect(merged.pagination).toEqual(override);
  });
});
