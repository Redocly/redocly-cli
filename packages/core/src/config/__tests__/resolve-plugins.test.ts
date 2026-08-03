import * as path from 'path';

import { defaultPlugin } from '../builtIn.js';
import { loadConfig } from '../load.js';

describe('resolving a plugin', () => {
  const configPath = path.join(__dirname, 'fixtures/plugin-config.yaml');

  it('should prefix rule names with the plugin id', async () => {
    const config = await loadConfig({ configPath });
    const plugin = config.plugins[0];

    expect(plugin.rules?.oas3).toHaveProperty('test-plugin/openid-connect-url-well-known');
  });

  it('should prefix preprocessor names with the plugin id', async () => {
    const config = await loadConfig({ configPath });
    const plugin = config.plugins[0];

    expect(plugin.preprocessors?.oas2).toHaveProperty('test-plugin/description-preprocessor');
  });

  it('should prefix decorator names with the plugin id', async () => {
    const config = await loadConfig({ configPath });
    const plugin = config.plugins[0];

    expect(plugin.decorators?.oas3).toHaveProperty('test-plugin/inject-x-stats');
  });

  it('should return only plugin paths without loading plugin code when skipPluginEval is true', async () => {
    const config = await loadConfig({
      configPath: path.join(__dirname, 'fixtures/skip-plugin-eval-config.yaml'),
      skipPluginEval: true,
    });

    expect(config.plugins).toEqual([
      { absolutePath: path.join(__dirname, 'fixtures/throwing-plugin.cjs') },
      defaultPlugin,
    ]);
  });

  it('should keep extends unresolved when skipPluginEval is true', async () => {
    const config = await loadConfig({
      configPath: path.join(__dirname, 'fixtures/skip-plugin-eval-config.yaml'),
      skipPluginEval: true,
    });

    expect(config.resolvedConfig.extends).toEqual(['test-plugin/recommended']);
    expect(config.resolvedConfig.apis).toEqual({ main: { root: './openapi.yaml' } });
  });

  it('should return the default project plugin path without loading plugin code when skipPluginEval is true', async () => {
    const config = await loadConfig({
      configPath: path.join(__dirname, 'fixtures/default-plugin/redocly.yaml'),
      skipPluginEval: true,
    });

    expect(config.plugins).toEqual([
      { absolutePath: path.join(__dirname, 'fixtures/default-plugin/@theme/plugin.js') },
      defaultPlugin,
    ]);
  });
});
