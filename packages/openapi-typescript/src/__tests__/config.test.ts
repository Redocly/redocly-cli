// packages/openapi-typescript/src/__tests__/config.test.ts
import { defineConfig } from '../config.js';

describe('defineConfig', () => {
  it('returns its argument unchanged (identity, for type-safe config authoring)', () => {
    const config = defineConfig({
      input: './openapi.yaml',
      output: './src/api.ts',
      outputMode: 'split',
      generators: ['sdk'],
    });
    expect(config).toEqual({
      input: './openapi.yaml',
      output: './src/api.ts',
      outputMode: 'split',
      generators: ['sdk'],
    });
  });

  it('accepts a minimal config (input + output only)', () => {
    expect(defineConfig({ input: 'a.yaml', output: 'a.ts' })).toEqual({
      input: 'a.yaml',
      output: 'a.ts',
    });
  });
});
