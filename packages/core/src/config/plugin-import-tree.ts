/**
 * TEMP: debug-only plugin import tree on `clearPluginsCache`. Tree is built
 * from disk by parsing `import` / `require` statements; every node carries the
 * same `?v=<cacheVersion>` because that's what the loader hook propagates.
 *
 * Removal: delete this file and the matching imports + calls in `plugins-cache.ts`.
 */

import * as fs from 'node:fs';
import module from 'node:module';
import * as path from 'node:path';
import * as url from 'node:url';

export type PluginClearLogEntry = {
  absolutePath: string;
  entryHref: string;
  version: number;
};

type TreeNode = {
  label: string;
  children: TreeNode[];
  cycle?: boolean;
};

const EXTENSIONS = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx'];
const INDEX_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts'];

const ESM_IMPORT_RE = /^[ \t]*import\s+(?:.+?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/gm;
const CJS_REQUIRE_RE = /(?:^|[^.\w])require\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
const DYNAMIC_IMPORT_RE = /(?:^|[^.\w])import\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;

function resolveRelativeImport(spec: string, fromDir: string): string | null {
  for (const ext of EXTENSIONS) {
    const candidate = path.resolve(fromDir, spec + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  for (const ext of INDEX_EXTENSIONS) {
    const candidate = path.resolve(fromDir, spec, `index${ext}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function parseImports(source: string, fromDir: string): string[] {
  const resolved: string[] = [];
  const push = (spec: string): void => {
    const r = resolveRelativeImport(spec, fromDir);
    if (r) resolved.push(r);
  };
  let m: RegExpExecArray | null;
  ESM_IMPORT_RE.lastIndex = 0;
  while ((m = ESM_IMPORT_RE.exec(source))) push(m[1]);
  CJS_REQUIRE_RE.lastIndex = 0;
  while ((m = CJS_REQUIRE_RE.exec(source))) push(m[1]);
  DYNAMIC_IMPORT_RE.lastIndex = 0;
  while ((m = DYNAMIC_IMPORT_RE.exec(source))) push(m[1]);
  return resolved;
}

function fileHrefWithVersion(absPath: string, versionParam: string, version: number): string {
  const u = url.pathToFileURL(absPath);
  u.searchParams.set(versionParam, String(version));
  return u.href;
}

function buildImportTree(
  filePath: string,
  versionParam: string,
  version: number,
  ancestors: Set<string> = new Set()
): TreeNode {
  const label = fileHrefWithVersion(filePath, versionParam, version);
  const node: TreeNode = { label, children: [] };
  if (ancestors.has(filePath)) {
    node.cycle = true;
    return node;
  }
  let source = '';
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    return node;
  }
  const next = new Set(ancestors);
  next.add(filePath);
  const seen = new Set<string>();
  for (const resolved of parseImports(source, path.dirname(filePath))) {
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    node.children.push(buildImportTree(resolved, versionParam, version, next));
  }
  return node;
}

function renderTree(node: TreeNode, prefix = '', isLast = true, depth = 0): string[] {
  const branch = depth === 0 ? '' : isLast ? '└─ ' : '├─ ';
  const cycle = node.cycle ? ' [CYCLE]' : '';
  const lines = [prefix + branch + node.label + cycle];
  if (node.cycle) return lines;
  const childPrefix = prefix + (depth === 0 ? '' : isLast ? '   ' : '│  ');
  node.children.forEach((c, i) =>
    lines.push(...renderTree(c, childPrefix, i === node.children.length - 1, depth + 1))
  );
  return lines;
}

let clearCounter = 0;

// Off by default; set `REDOCLY_DEBUG_PLUGINS_CACHE=1` (or any truthy value) to
// enable. Keeps stderr clean for snapshot/smoke tests.
const DEBUG = true; // TEMP: force-on while debugging

export function logHookStatus(): void {
  if (!DEBUG) return;
  const ok = typeof module.registerHooks === 'function';
  process.stderr.write(`[plugins-cache] module.registerHooks=${ok ? 'available' : 'missing'}\n`);
}

/** TEMP: after `clearPluginsCache` — tree with current `?v=<cacheVersion>` URLs. */
export function logClearPluginImportTrees(
  entries: PluginClearLogEntry[],
  versionParam: string
): void {
  if (!DEBUG) return;
  clearCounter += 1;
  const out: string[] = [];
  out.push('─'.repeat(70));
  out.push(`[plugins-cache] clearPluginsCache #${clearCounter} — current import tree`);
  if (entries.length === 0) {
    out.push('  (no plugin paths were in cache)');
  }
  // Render each plugin entry as a sibling at depth 1 of an implicit root, so
  // multiple entries appear under a single tree.
  entries.forEach((e, i) => {
    const isLast = i === entries.length - 1;
    const root = buildImportTree(e.absolutePath, versionParam, e.version);
    renderTree(root, '', isLast, 1).forEach((l) => out.push('  ' + l));
  });
  out.push('─'.repeat(70));
  process.stderr.write(out.join('\n') + '\n');
}
