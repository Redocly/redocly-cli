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
  /** Same value as `?v=` on the entry URL. */
  version: number;
};

type TreeNode = {
  label: string;
  children: TreeNode[];
  cycle?: boolean;
  edge?: string;
};

const EXTENSIONS = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx'];
const INDEX_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts'];

const ESM_IMPORT_RE = /^[ \t]*import\s+(?:(.+?)\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/gm;
const CJS_REQUIRE_RE = /(?:^|[^.\w])require\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
const DYNAMIC_IMPORT_RE = /(?:^|[^.\w])import\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;

function describeImportClause(clause: string | undefined): string {
  if (!clause) return 'side-effect';
  const c = clause.trim();
  const ns = c.match(/^\*\s+as\s+(\w+)$/);
  if (ns) return `* as ${ns[1]}`;
  const def = c.match(/^([\w$]+)(?:\s*,\s*\{([^}]+)\})?$/);
  if (def) {
    const named = def[2]
      ? `, { ${def[2]
          .split(',')
          .map((s) => s.trim())
          .join(', ')} }`
      : '';
    return `default → ${def[1]}${named}`;
  }
  const named = c.match(/^\{([^}]+)\}$/);
  if (named)
    return `{ ${named[1]
      .split(',')
      .map((s) => s.trim())
      .join(', ')} }`;
  return c;
}

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

function parseEdges(
  source: string,
  fromDir: string
): { spec: string; resolved: string; description: string }[] {
  const edges: { spec: string; resolved: string; description: string }[] = [];
  const push = (spec: string, description: string): void => {
    const resolved = resolveRelativeImport(spec, fromDir);
    if (resolved) edges.push({ spec, resolved, description });
  };
  let m: RegExpExecArray | null;
  ESM_IMPORT_RE.lastIndex = 0;
  while ((m = ESM_IMPORT_RE.exec(source))) push(m[2], describeImportClause(m[1]));
  CJS_REQUIRE_RE.lastIndex = 0;
  while ((m = CJS_REQUIRE_RE.exec(source))) push(m[1], 'require()');
  DYNAMIC_IMPORT_RE.lastIndex = 0;
  while ((m = DYNAMIC_IMPORT_RE.exec(source))) push(m[1], 'import() dynamic');
  return edges;
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
  ancestors: Set<string> = new Set(),
  edge?: string
): TreeNode {
  const label = fileHrefWithVersion(filePath, versionParam, version);
  const node: TreeNode = { label, children: [], edge };
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
  const dir = path.dirname(filePath);
  const seen = new Set<string>();
  const next = new Set(ancestors);
  next.add(filePath);
  for (const e of parseEdges(source, dir)) {
    if (seen.has(e.resolved)) continue;
    seen.add(e.resolved);
    node.children.push(
      buildImportTree(e.resolved, versionParam, version, next, `${e.spec}  [${e.description}]`)
    );
  }
  return node;
}

function renderTree(node: TreeNode, prefix = '', isLast = true, depth = 0): string[] {
  const branch = depth === 0 ? '' : isLast ? '└─ ' : '├─ ';
  const cycle = node.cycle ? ' [CYCLE]' : '';
  const edge = node.edge ? `  ← ${node.edge}` : '';
  const lines = [prefix + branch + node.label + cycle + edge];
  if (node.cycle) return lines;
  const childPrefix = prefix + (depth === 0 ? '' : isLast ? '   ' : '│  ');
  node.children.forEach((c, i) =>
    lines.push(...renderTree(c, childPrefix, i === node.children.length - 1, depth + 1))
  );
  return lines;
}

let clearCounter = 0;

export function logHookStatus(): void {
  const ok = typeof module.registerHooks === 'function';
  process.stderr.write(`[plugins-cache] module.registerHooks=${ok ? 'available' : 'missing'}\n`);
}

/** TEMP: after `clearPluginsCache` — tree with current `?v=<cacheVersion>` URLs. */
export function logClearPluginImportTrees(
  entries: PluginClearLogEntry[],
  versionParam: string
): void {
  clearCounter += 1;
  const out: string[] = [];
  out.push('─'.repeat(70));
  out.push(`[plugins-cache] clearPluginsCache #${clearCounter} — current import tree`);
  if (entries.length === 0) {
    out.push('  (no plugin paths were in cache)');
  }
  for (const e of entries) {
    out.push(`  plugin: ${path.basename(e.absolutePath)}`);
    out.push(`  path: ${e.absolutePath}`);
    out.push(`  entry import URL (now): ${e.entryHref}`);
    renderTree(buildImportTree(e.absolutePath, versionParam, e.version)).forEach((l) =>
      out.push('  ' + l)
    );
    out.push('');
  }
  if (entries.length > 0) out.pop();
  out.push('─'.repeat(70));
  process.stderr.write(out.join('\n') + '\n');
}
