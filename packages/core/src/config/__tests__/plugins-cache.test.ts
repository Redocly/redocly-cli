import module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  clearPluginsCache,
  getPluginCacheVersion,
  loadPluginModule,
  setCachedPlugins,
} from '../plugins-cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures/resolve-config');
const cjsPluginPath = path.join(fixturesDir, 'plugin-with-init-logic.cjs');
const esmPluginPath = path.join(fixturesDir, 'plugin-with-init-logic.js');
const unrelatedCjsPath = path.join(fixturesDir, 'realm-plugin.cjs');

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
    it('should reload cjs plugin so a fresh module is returned', async () => {
      const first = await loadPluginModule(cjsPluginPath);
      // require.cache eviction targets paths registered in pluginsCache.
      setCachedPlugins(cjsPluginPath, []);

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

    it('should not evict cjs modules outside the plugin dependency graph', async () => {
      const nodeRequire = module.createRequire(cjsPluginPath);
      nodeRequire(unrelatedCjsPath);
      expect(nodeRequire.cache[unrelatedCjsPath]).toBeDefined();

      await loadPluginModule(cjsPluginPath);
      setCachedPlugins(cjsPluginPath, []);

      clearPluginsCache();

      expect(nodeRequire.cache[unrelatedCjsPath]).toBeDefined();
    });
  });

  describe('getPluginCacheVersion', () => {
    it('should increment on each clearPluginsCache call', () => {
      const before = getPluginCacheVersion();

      clearPluginsCache();
      expect(getPluginCacheVersion()).toBe(before + 1);

      clearPluginsCache();
      expect(getPluginCacheVersion()).toBe(before + 2);
    });
  });
});
