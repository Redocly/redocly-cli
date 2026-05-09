import * as fs from 'node:fs';
import module from 'node:module';
import * as path from 'node:path';
import * as url from 'node:url';

// ─── LOGGING (TEMP, language-server) — remove this import + all `LOGGING` blocks
//     below together with `plugin-import-tree.ts`. ───
import { logClearPluginImportTrees, logHookStatus } from './plugin-import-tree.js';
import type { Plugin } from './types.js';

const pluginsCache: Map<string, Plugin[]> = new Map();
// Memoizes the directory walk that produces the plugin's cache-bust mtime.
// Cleared in `clearPluginsCache()` so the next load re-walks the directory; if any
// file changed on disk, the new `?redocly-mtime=` busts Node's ESM cache.
const pluginMtimeCache: Map<string, number> = new Map();

// URL search-param key that does double duty: its presence flags a URL as
// plugin-scoped (so the global resolve hook only acts on our imports), and
// its value is the file's mtime in ms (the cache-bust key).
const PLUGIN_MTIME_PARAM = 'redocly-mtime';

let isEsmCacheBustHookRegistered = false;

// `module.registerHooks` runs in the main thread (Node >= 22.15). It must NOT
// be registered at module top-level: importing `openapi-core` during LSP
// startup would then run a process-wide resolve hook before the server is
// ready. We register lazily from `clearPluginsCache` / `loadPluginModule`.
function registerHooksImpl(): void {
  module.registerHooks({
    resolve(specifier, context, nextResolve) {
      const result = nextResolve(specifier, context);
      if (!result.url.startsWith('file:')) return result;
      if (!context.parentURL) return result;
      if (!new URL(context.parentURL).searchParams.has(PLUGIN_MTIME_PARAM)) return result;

      const childURL = new URL(result.url);
      if (childURL.pathname.includes('/node_modules/')) return result;

      let out = result;
      if (!childURL.searchParams.has(PLUGIN_MTIME_PARAM)) {
        try {
          const mtimeMs = fs.statSync(url.fileURLToPath(childURL)).mtimeMs;
          childURL.searchParams.set(PLUGIN_MTIME_PARAM, String(Math.floor(mtimeMs)));
          out = { ...result, url: childURL.href, shortCircuit: true };
        } catch {
          // keep `out === result`
        }
      }

      return out;
    },
  });
}

// Requires Node >= 22.15 (`module.registerHooks`). Without it, nested ESM
// plugin imports are not cache-busted (entry `import()` still uses `?redocly-mtime=`).
function ensureEsmCacheBustHook(): void {
  if (isEsmCacheBustHookRegistered) return;
  if (typeof module.registerHooks !== 'function') return;
  try {
    registerHooksImpl();
    isEsmCacheBustHookRegistered = true;
  } catch {
    // Retry on a later `clearPluginsCache()` / `loadPluginModule()`.
  }
}

function getPluginMtime(entryPath: string): number {
  let mtime = pluginMtimeCache.get(entryPath);
  if (mtime === undefined) {
    mtime = Math.floor(computePluginMaxMtime(entryPath));
    pluginMtimeCache.set(entryPath, mtime);
  }
  return mtime;
}

// Largest mtime under the plugin's directory — used as the entry URL's
// `?redocly-mtime=`. Over-conservative (e.g. README edits also bump it), but
// unchanged children still reuse their cached graphs via the per-file hook.
function computePluginMaxMtime(entryPath: string): number {
  // node_modules plugins are immutable for the process — skip the walk.
  if (entryPath.includes(`${path.sep}node_modules${path.sep}`)) {
    return safeMtime(entryPath);
  }

  let maxMtime = 0;

  function walkDir(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        const mtime = safeMtime(fullPath);
        if (mtime > maxMtime) maxMtime = mtime;
      }
    }
  }

  walkDir(path.dirname(entryPath));
  return maxMtime;
}

function safeMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
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

function evictPluginFromRequireCache(pluginPath: string): void {
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
  // CJS: evict matching entries from `require.cache` (skip node_modules).
  // ESM: drop the mtime map so the next load re-walks the directory; if any
  // file changed on disk, the new `?redocly-mtime=` busts Node's ESM cache.
  const paths = [...pluginsCache.keys()];

  for (const pluginPath of paths) {
    evictPluginFromRequireCache(pluginPath);
  }
  pluginsCache.clear();
  pluginMtimeCache.clear();
  ensureEsmCacheBustHook();

  // LOGGING (TEMP): import tree to stderr after each clear. Uses a fresh
  // `computePluginMaxMtime` walk only — do not call `getPluginMtime` here or it
  // would repopulate `pluginMtimeCache` before the next `loadPluginModule()`
  // (e.g. tests bump mtimes between clear and load).
  const entries = paths.map((absolutePath) => {
    const entryMtime = Math.floor(computePluginMaxMtime(absolutePath));
    const pluginUrl = url.pathToFileURL(absolutePath);
    pluginUrl.searchParams.set(PLUGIN_MTIME_PARAM, String(entryMtime));
    return { absolutePath, entryHref: pluginUrl.href, entryMtime };
  });
  logClearPluginImportTrees(entries, PLUGIN_MTIME_PARAM, safeMtime);
};

export async function loadPluginModule(
  absolutePluginPath: string
): Promise<Record<string, unknown>> {
  // First load must install the hook before `import()` so nested plugin files
  // get their own `?redocly-mtime=` (not only after a prior `clearPluginsCache`).
  ensureEsmCacheBustHook();

  const pluginUrl = url.pathToFileURL(absolutePluginPath);
  pluginUrl.searchParams.set(PLUGIN_MTIME_PARAM, String(getPluginMtime(absolutePluginPath)));

  return import(/* webpackIgnore: true */ pluginUrl.href);
}

// LOGGING (TEMP): once at module load — whether `registerHooks` exists.
logHookStatus();
