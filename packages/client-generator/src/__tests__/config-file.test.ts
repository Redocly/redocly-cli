import { mergeConfig } from '../config-file.js';

describe('mergeConfig', () => {
  it('CLI overrides win over base values; undefined overrides are ignored', () => {
    const merged = mergeConfig(
      { input: 'spec.yaml', output: 'a.ts', outputMode: 'single' },
      { output: 'b.ts', outputMode: undefined, facade: 'service-class' }
    );
    expect(merged).toEqual({
      input: 'spec.yaml',
      output: 'b.ts',
      outputMode: 'single',
      facade: 'service-class',
    });
  });
});
