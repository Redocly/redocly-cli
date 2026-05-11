import module from 'node:module';
import * as url from 'node:url';

import { logger } from '../logger.js';
import type { Plugin } from './types.js';

const pluginsCache: Map<string, Plugin[]> = new Map();

// Marks plugin-scoped URLs and carries the cache-bust version.
const PLUGIN_VERSION_PARAM = 'v';

// Cleared in `clearPluginsCache()` so the next load re-walks the directory; if any
// file changed on disk, the new `?v=` busts Node's ESM cache.
let cacheVersion = 0;

let isEsmCacheBustHookRegistered = false;

function registerEsmCacheBustHook(): void {
  module.registerHooks({
    resolve(specifier, context, nextResolve) {
      const result = nextResolve(specifier, context);
      if (!result.url.startsWith('file:')) return result;
      if (!context.parentURL) return result;

      const parentVersion = new URL(context.parentURL).searchParams.get(PLUGIN_VERSION_PARAM);
      if (!parentVersion) return result;

      const childURL = new URL(result.url);
      if (childURL.pathname.includes('/node_modules/')) return result;
      if (childURL.searchParams.has(PLUGIN_VERSION_PARAM)) return result;

      // Propagate parent's version down the whole plugin graph so every nested
      // URL is busted together with the entry.
      childURL.searchParams.set(PLUGIN_VERSION_PARAM, parentVersion);
      return { ...result, url: childURL.href, shortCircuit: true };
    },
  });
}
function ensureEsmCacheBustHook(): void {
  if (isEsmCacheBustHookRegistered) return;
  isEsmCacheBustHookRegistered = true;

  if (typeof module.registerHooks !== 'function') {
    logger.warn(
      `Redocly plugin reload requires Node.js >= 22.15 (current: ${process.version}). ` +
        `ESM plugins will not pick up edits until the process restarts.\n`
    );
    return;
  }

  registerEsmCacheBustHook();
}

export function hasCachedPlugin(absolutePluginPath: string): boolean {
  return pluginsCache.has(absolutePluginPath);
}

export function getCachedPlugins(absolutePluginPath: string): Plugin[] | undefined {
  return pluginsCache.get(absolutePluginPath);
}

export function setCachedPlugins(absolutePluginPath: string, plugins: Plugin[]): void {
  pluginsCache.set(absolutePluginPath, plugins);
}

export function getPluginCacheVersion(): number {
  return cacheVersion;
}

function evictPluginFromCjsCache(pluginPath: string): void {
  const nodeRequire = module.createRequire(pluginPath);
  const visited = new Set<string>();

  const evict = (modulePath: string): void => {
    if (visited.has(modulePath)) return;
    visited.add(modulePath);
    const cached = nodeRequire.cache[modulePath];
    if (!cached) return;
    for (const child of cached.children) {
      if (/[/\\]node_modules[/\\]/.test(child.id)) continue;
      evict(child.id);
    }
    delete nodeRequire.cache[modulePath];
  };

  evict(pluginPath);
}

export const clearPluginsCache = (): void => {
  // CJS: evict from `require.cache` (skip node_modules).
  // ESM: bump version; next load uses a fresh `?v=` so Node re-imports every
  // module in the plugin graph.
  const paths = [...pluginsCache.keys()];

  for (const pluginPath of paths) {
    evictPluginFromCjsCache(pluginPath);
  }
  pluginsCache.clear();
  cacheVersion += 1;
  ensureEsmCacheBustHook();
};

export async function loadPluginModule(
  absolutePluginPath: string
): Promise<Record<string, unknown>> {
  const pluginUrl = url.pathToFileURL(absolutePluginPath);
  pluginUrl.searchParams.set(PLUGIN_VERSION_PARAM, String(cacheVersion));

  // `webpackIgnore` keeps this dynamic import as a runtime `import()` so Node's
  // ESM loader (with our `?v=` cache-bust hook) handles it instead of webpack
  // rewriting it during VSCE/Reunite bundling.
  return import(/* webpackIgnore: true */ pluginUrl.href);
}
