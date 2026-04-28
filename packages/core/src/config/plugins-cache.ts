import module from 'node:module';
import * as url from 'node:url';

import type { Plugin } from './types.js';

const pluginsCache: Map<string, Plugin[]> = new Map();

let pluginsCacheVersion = 0;
let isEsmCacheBustHookRegistered = false;

const ESM_CACHE_BUST_HOOK_SOURCE = `
export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (!result.url.startsWith('file:')) return result;
  if (!context.parentURL) return result;
  const parentV = new URL(context.parentURL).searchParams.get('v');
  if (!parentV) return result;
  const childURL = new URL(result.url);
  if (childURL.pathname.includes('/node_modules/')) return result;
  if (!childURL.searchParams.has('v')) {
    childURL.searchParams.set('v', parentV);
  }
  return { ...result, url: childURL.href, shortCircuit: true };
}
`;

function ensureEsmCacheBustHook(): void {
  if (isEsmCacheBustHookRegistered) return;
  if (typeof module.register !== 'function') return;
  try {
    module.register(
      `data:text/javascript,${encodeURIComponent(ESM_CACHE_BUST_HOOK_SOURCE)}`,
      import.meta.url
    );
    isEsmCacheBustHookRegistered = true;
  } catch {
    // silently fail; without the hook only the entry plugin is cache-busted.
    // The flag stays false so a later `clearPluginsCache()` will retry.
  }
}

export function hasCachedPlugin(absolutePluginPath: string): boolean {
  return pluginsCache.has(absolutePluginPath);
}

export function getCachedPlugins(absolutePluginPath: string): Plugin[] | undefined {
  return pluginsCache.get(absolutePluginPath);
}

export function cachePlugins(absolutePluginPath: string, plugins: Plugin[]): void {
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
      if (child.id.includes('/node_modules/')) continue;
      evict(child.id);
    }
    delete nodeRequire.cache[modulePath];
  };

  evict(pluginPath);
}

export const clearPluginsCache = (): void => {
  // CJS: walk each plugin's dependency graph via `module.children` and evict
  // matching `require.cache` entries (skipping node_modules).
  // ESM: bumping `pluginsCacheVersion` makes the next `import()` use a fresh
  // `?v=N` URL; the loader hook propagates it to nested imports.
  for (const pluginPath of pluginsCache.keys()) {
    evictPluginFromRequireCache(pluginPath);
  }
  pluginsCache.clear();
  pluginsCacheVersion++;
  ensureEsmCacheBustHook();
};

export async function loadPluginModule(
  absolutePluginPath: string
): Promise<Record<string, unknown>> {
  const pluginUrl = url.pathToFileURL(absolutePluginPath);
  if (pluginsCacheVersion) {
    pluginUrl.searchParams.set('v', String(pluginsCacheVersion));
  }
  return import(pluginUrl.href);
}
