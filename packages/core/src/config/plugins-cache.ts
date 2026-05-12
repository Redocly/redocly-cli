import module from 'node:module';

import type { Plugin } from './types.js';

const pluginsCache: Map<string, Plugin[]> = new Map();

export function hasCachedPlugin(absolutePluginPath: string): boolean {
  return pluginsCache.has(absolutePluginPath);
}

export function getCachedPlugins(absolutePluginPath: string): Plugin[] | undefined {
  return pluginsCache.get(absolutePluginPath);
}

export function setCachedPlugins(absolutePluginPath: string, plugins: Plugin[]): void {
  pluginsCache.set(absolutePluginPath, plugins);
}

function evictPluginFromRequireCache(pluginPath: string): void {
  const nodeRequire = module.createRequire(pluginPath);
  const visited = new Set<string>();

  const evict = (modulePath: string): void => {
    if (visited.has(modulePath)) return;
    visited.add(modulePath);
    const cached = nodeRequire.cache[modulePath];
    if (!cached) return;
    for (const child of cached.children) {
      // skip node_modules: shared deps shouldn't be re-evaluated.
      // `child.id` is a filesystem path that uses `\` on Windows, so we match
      // both separators.
      if (/[/\\]node_modules[/\\]/.test(child.id)) continue;
      evict(child.id);
    }
    delete nodeRequire.cache[modulePath];
  };

  evict(pluginPath);
}

export const clearPluginsCache = (): void => {
  for (const pluginPath of pluginsCache.keys()) {
    evictPluginFromRequireCache(pluginPath);
  }
  pluginsCache.clear();
};

// Plugins are loaded synchronously via `require()`, which works for both CJS
// and ESM (Node's `require(esm)` is enabled by default on the supported
// engines: >=20.19, >=22.12). This unifies caching: every plugin and its deps
// land in `require.cache`, so eviction in `clearPluginsCache` actually frees
// memory and survives the next call. Limitation: ESM plugins cannot use
// top-level `await`.
export async function loadPluginModule(
  absolutePluginPath: string
): Promise<Record<string, unknown>> {
  const nodeRequire = module.createRequire(absolutePluginPath);
  return nodeRequire(absolutePluginPath);
}
