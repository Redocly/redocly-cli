import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from '../load.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
describe('resolving a plugin', () => {
  const configPath = path.join(__dirname, 'fixtures/plugin-config.yaml');

  it('should prefix rule names with the plugin id', async () => {
    const config = await loadConfig({ configPath });
    const plugin = config.styleguide.plugins[0];

    expect(plugin.rules?.oas3).toHaveProperty('test-plugin/openid-connect-url-well-known');
  });

  it('should prefix preprocessor names with the plugin id', async () => {
    const config = await loadConfig({ configPath });
    const plugin = config.styleguide.plugins[0];

    expect(plugin.preprocessors?.oas2).toHaveProperty('test-plugin/description-preprocessor');
  });

  it('should prefix decorator names with the plugin id', async () => {
    const config = await loadConfig({ configPath });
    const plugin = config.styleguide.plugins[0];

    expect(plugin.decorators?.oas3).toHaveProperty('test-plugin/inject-x-stats');
  });
});
