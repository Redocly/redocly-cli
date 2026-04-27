import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { clearPluginsCache, loadPluginModule, pluginsCache } from '../plugins-cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures/resolve-config');
const cjsPluginPath = path.join(fixturesDir, 'plugin-with-init-logic.cjs');
const esmPluginPath = path.join(fixturesDir, 'plugin-with-init-logic.js');

afterEach(() => {
  clearPluginsCache();
});

describe('plugins-cache', () => {
  describe('loadPluginModule', () => {
    it('should return the same module on subsequent imports of the same cjs plugin', async () => {
      const first = await loadPluginModule(cjsPluginPath);
      const second = await loadPluginModule(cjsPluginPath);

      expect(second).toBe(first);
    });

    it('should return the same module on subsequent imports of the same esm plugin', async () => {
      const first = await loadPluginModule(esmPluginPath);
      const second = await loadPluginModule(esmPluginPath);

      expect(second).toBe(first);
    });
  });

  describe('clearPluginsCache', () => {
    it('should empty pluginsCache map', () => {
      pluginsCache.set('/some/path', []);
      pluginsCache.set('/another/path', []);
      expect(pluginsCache.size).toBe(2);

      clearPluginsCache();

      expect(pluginsCache.size).toBe(0);
    });

    it('should reload cjs plugin so a fresh module is returned', async () => {
      const first = await loadPluginModule(cjsPluginPath);
      // require.cache eviction targets paths registered in pluginsCache.
      pluginsCache.set(cjsPluginPath, []);

      clearPluginsCache();

      const second = await loadPluginModule(cjsPluginPath);
      expect(second).not.toBe(first);
    });

    it('should reload esm plugin so a fresh module is returned', async () => {
      const first = await loadPluginModule(esmPluginPath);

      clearPluginsCache();

      const second = await loadPluginModule(esmPluginPath);
      expect(second).not.toBe(first);
    });
  });
});
