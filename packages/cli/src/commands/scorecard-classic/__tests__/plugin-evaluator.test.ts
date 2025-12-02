import { evaluatePluginsFromCode } from '../validation/plugin-evaluator.js';

describe('evaluatePluginsFromCode', () => {
  it('should return empty array when no plugins code provided', async () => {
    const result = await evaluatePluginsFromCode(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array when empty string provided', async () => {
    const result = await evaluatePluginsFromCode('');
    expect(result).toEqual([]);
  });

  it('should return empty array on invalid plugin code', async () => {
    const result = await evaluatePluginsFromCode('invalid code');
    expect(result).toEqual([]);
  });

  it('should evaluate valid plugin code and return plugins', async () => {
    const validPluginCode = `
      export default [
        () => ({
          id: 'test-plugin',
          rules: {
            oas3: {
              'test-rule': () => ({})
            }
          }
        })
      ];
    `;

    const result = await evaluatePluginsFromCode(validPluginCode);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('id', 'test-plugin');
  });

  it('should handle __redocly_dirname replacement', async () => {
    const pluginCodeWithDirname = `
      const dirname = __redocly_dirname;
      export default [() => ({ id: 'test', dirname })];
    `;

    const result = await evaluatePluginsFromCode(pluginCodeWithDirname);
    expect(result).toHaveLength(1);
  });
});
