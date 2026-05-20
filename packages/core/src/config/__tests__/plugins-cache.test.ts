import * as fs from 'node:fs';
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
const pluginWithDepsPath = path.join(fixturesDir, 'plugin-with-deps.cjs');
const localHelperPath = path.join(fixturesDir, 'plugin-with-deps-helper.cjs');
const nodeModulesDir = path.join(fixturesDir, 'node_modules');
const nodeModulesPkgPath = path.join(nodeModulesDir, 'fake-pkg/index.cjs');

// `node_modules/` is gitignored at the repo root, so the fake-pkg fixture
// isn't tracked — create it on the fly for each test run.
beforeAll(() => {
  fs.mkdirSync(path.dirname(nodeModulesPkgPath), { recursive: true });
  fs.writeFileSync(nodeModulesPkgPath, "module.exports = { id: 'fake-pkg' };\n");
});

afterAll(() => {
  fs.rmSync(nodeModulesDir, { recursive: true, force: true });
});

afterEach(() => {
  clearPluginsCache();
});

describe('plugins-cache', () => {
  describe('clearPluginsCache', () => {
    it('should reload cjs plugin so a fresh module is returned', async () => {
      const first = await loadPluginModule(cjsPluginPath);
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

    it('should evict local plugin deps but skip node_modules', () => {
      const nodeRequire = module.createRequire(pluginWithDepsPath);
      nodeRequire(pluginWithDepsPath);
      setCachedPlugins(pluginWithDepsPath, []);

      expect(nodeRequire.cache[pluginWithDepsPath]).toBeDefined();
      expect(nodeRequire.cache[localHelperPath]).toBeDefined();
      expect(nodeRequire.cache[nodeModulesPkgPath]).toBeDefined();

      clearPluginsCache();

      expect(nodeRequire.cache[pluginWithDepsPath]).toBeUndefined();
      expect(nodeRequire.cache[localHelperPath]).toBeUndefined();
      // node_modules deps are skipped to keep npm singletons stable across clears.
      expect(nodeRequire.cache[nodeModulesPkgPath]).toBeDefined();
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
