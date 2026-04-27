import module from 'node:module';
import * as path from 'node:path';
import * as url from 'node:url';

import type { Plugin } from './types.js';

// Plugins instantiated during the current process, keyed by absolute path.
// `clearPluginsCache()` drops the memo, evicts CJS deps from `require.cache`,
// and bumps `?v=N` so subsequent ESM imports re-evaluate. The resolver hook
// below propagates `?v=N` from a parent URL to nested `file:` imports so the
// whole plugin subgraph reloads, not just the entry.
export const pluginsCache: Map<string, Plugin[]> = new Map();
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
  isEsmCacheBustHookRegistered = true;
  if (typeof module.register !== 'function') return;
  try {
    module.register(
      `data:text/javascript,${encodeURIComponent(ESM_CACHE_BUST_HOOK_SOURCE)}`,
      import.meta.url
    );
  } catch {
    // silently fail; without the hook only the entry plugin is cache-busted
  }
}

export const clearPluginsCache = (): void => {
  // CJS: evict matching entries from `require.cache`.
  // ESM: bumping `pluginsCacheVersion` makes the next `import()` use a fresh
  // `?v=N` URL; the loader hook propagates it to nested imports.
  for (const pluginPath of pluginsCache.keys()) {
    const nodeRequire = module.createRequire(pluginPath);
    const pluginDir = path.dirname(pluginPath) + path.sep;
    for (const cachedPath of Object.keys(nodeRequire.cache)) {
      if (cachedPath.startsWith(pluginDir)) {
        delete nodeRequire.cache[cachedPath];
      }
    }
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
