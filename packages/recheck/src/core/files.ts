import * as fs from 'fs/promises';
import * as path from 'path';
import picomatch from 'picomatch';

import { parseMarkdown } from '../parser/index.js';
import { getImageDestinations } from '../rules/token/helpers.js';
import type { ScopeRuleContext } from '../rules/types.js';
import type { NormalizedRule } from '../types/index.js';

const SKIP_DIRS = ['node_modules', 'dist', 'build'];

export async function discoverMarkdownFiles(inputPath: string): Promise<string[]> {
  async function walkDir(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || SKIP_DIRS.includes(entry.name)) {
            continue;
          }
          files.push(...(await walkDir(fullPath)));
        } else if (
          entry.isFile() &&
          picomatch.isMatch(entry.name, '*.{md,markdown}', { nocase: true })
        ) {
          files.push(fullPath);
        }
      }
    } catch {
      return [];
    }

    return files;
  }

  const stat = await fs.stat(inputPath);
  if (stat.isFile()) {
    return [inputPath];
  } else if (stat.isDirectory()) {
    return walkDir(inputPath);
  } else {
    return [];
  }
}

/**
 * Load list of changed files from either a file path or stdin
 */
export async function loadChangedFiles(changedListPath?: string): Promise<string[]> {
  // 1) Prefer explicit file path
  if (changedListPath && changedListPath.length > 0) {
    try {
      const content = await fs.readFile(changedListPath, 'utf8');
      return content
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch (_err) {
      return [];
    }
  }
  // 2) Otherwise try to read from stdin if piped
  if (process.stdin.isTTY) return [];
  const chunks: string[] = [];
  return await new Promise<string[]>((resolve) => {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => chunks.push(String(d)));
    process.stdin.on('end', () => {
      const text = chunks.join('');
      const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      resolve(lines);
    });
    process.stdin.resume();
  });
}

/**
 * Runs `fn` over `items` with at most `limit` calls in flight at once,
 * returning results in the same order as `items` regardless of completion
 * order. Used to bound concurrency for disk I/O (e.g. lintFiles' reads)
 * without pulling in a workspace dependency — recheck is published
 * independently, so it can't depend on @redocly/shared's promiseMapLimit.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Whether any of the given rules use the max-image-size assertion, which
 * requires loading image metadata (file size, existence) from disk.
 */
export function needsImageMetadata(rules: NormalizedRule[]): boolean {
  return rules.some((rule) => Object.keys(rule.assertions).includes('max-image-size'));
}

/**
 * Extracts every local (non-`http(s)://`) image destination referenced in
 * `content` — both inline (`![alt](path "title")`) and reference-style
 * (`![alt][ref]`, `![alt][]`, `![alt]`) syntax — via `getImageDestinations`
 * (rules/token/helpers.ts), the SAME AST-based extraction
 * `rules/scope/max-image-size.ts` uses to look images up in
 * `ScopeRuleContext.fileMetadata.images`. Sharing one extraction pass is
 * load-bearing, not just tidy: the strings returned here become the exact
 * Map keys `loadImageMetadata` below stores on-disk stats under, and
 * max-image-size looks metadata up by the identical destination string it
 * resolves from the same tree shape — a second, independently-written
 * extraction (even an AST-based one) could subtly disagree on edge cases
 * (e.g. angle-bracket literal destinations, reference normalization) and
 * silently break that lookup.
 *
 * Parses `content` itself rather than accepting a pre-built tree: neither
 * of this function's current callers (`lintFiles` in src/index.ts,
 * `runCommand` in src/commands/run.ts) has already parsed the file at the
 * point they call this — both read raw file content and call this
 * immediately after, before the runner's own `parseMarkdown` pass — so
 * there is no cheap existing tree to thread through. This parse only runs
 * at all when `needsImageMetadata` finds `max-image-size` configured (see
 * below), bounding the extra cost to that case.
 *
 * Deliberately parsed without `{ markdoc: true }`, even when the caller's
 * config has the flag on. `getImageDestinations` only reads `image` tokens
 * (from `![alt](dest)`/`![alt][ref]`) and link-reference definitions, and the
 * Markdoc syntax extension hooks only on `{`, so it cannot affect where
 * `!`/`[`/`]`/`(` constructs start, end, or resolve. The set of destinations is
 * the same either way, and threading the flag through would add a parameter
 * here and to two public signatures to preserve something already true by
 * construction.
 */
function extractImageReferences(content: string): string[] {
  return getImageDestinations(parseMarkdown(content))
    .map(({ destination }) => destination)
    .filter(
      (destination) => !destination.startsWith('http://') && !destination.startsWith('https://')
    );
}

/**
 * Cap on unique image refs processed per file by `loadImageMetadata`. Each
 * ref costs an `fs.stat`, so without a bound a pathological file (hundreds
 * of thousands of image refs) turns one lint into an unbounded stat storm.
 * 1,000 is far above any real document's image count. Refs beyond the cap
 * are OMITTED from the metadata map entirely — see the doc comment below
 * for why omission (not a fabricated `exists: false`) is the honest shape.
 */
export const MAX_IMAGE_REFS_PER_FILE = 1000;

/** Whether `resolved` (an absolute path) is `root` itself or inside it. */
function isInsideRoot(root: string, resolved: string): boolean {
  const relative = path.relative(root, resolved);
  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

/**
 * Loads on-disk metadata (size, existence) for images referenced in a markdown
 * file's content, keyed by the image path as written in the source.
 *
 * Refs are confined to `root` (default: `process.cwd()`): a ref whose
 * resolved path escapes the root — `../` traversal above it, or an absolute
 * path like `/etc/passwd` — is recorded as `exists: false` WITHOUT being
 * stat'ed, so a hostile document can't use the linter to probe existence or
 * size of arbitrary files (both would otherwise leak into lint output).
 * Site-absolute doc refs like `/images/foo.png` land in the same bucket,
 * which matches the previous behavior for them observably: they used to be
 * stat'ed against the FILESYSTEM root, fail, and come back `exists: false`
 * anyway. Callers linting files outside their cwd should pass the lint root
 * explicitly (`lintFiles` threads its `root` option here).
 *
 * Confinement is physical, not just lexical: after the string-level check,
 * each surviving ref is `fs.realpath`'d and its REAL path must sit inside
 * the REAL root (the root's own realpath, resolved once per call). Without
 * this, a symlink planted INSIDE the root (`root/docs/evil.png ->
 * /etc/passwd`, or a symlinked directory escaping the root) passes the
 * lexical check and `fs.stat` follows it, leaking the target's existence
 * and size. Symlinks that RESOLVE inside the root keep working — legit repo
 * layouts symlink shared asset dirs around within the checkout. When
 * `realpath` throws (ENOENT for a missing file or dangling link — the
 * common case — or any other resolution failure), the ref falls through to
 * the same `fs.stat` try/catch as before: `stat` performs the identical
 * full path resolution, so it fails the same way and the ref reads
 * `exists: false` exactly as missing files always have. Cost: one extra
 * realpath per stat'ed image, only on the max-image-size code path.
 *
 * At most `MAX_IMAGE_REFS_PER_FILE` unique refs are processed; overflow refs
 * are omitted from the map rather than recorded. An absent key means "no
 * metadata loaded" to consumers — `max-image-size` skips refs it finds no
 * entry for, exactly as it skips `exists: false` entries — so omission never
 * fabricates a "this image is missing" fact for a ref that was simply never
 * checked. Duplicate refs share one entry (and one stat) and don't consume
 * extra cap slots.
 */
export async function loadImageMetadata(
  file: string,
  content: string,
  root: string = process.cwd()
): Promise<ScopeRuleContext['fileMetadata']> {
  const images = new Map();
  const baseDir = path.dirname(file);
  const resolvedRoot = path.resolve(root);
  const imageReferences = extractImageReferences(content);

  // The root's physical identity, resolved once per call (not per ref).
  // `undefined` when the root itself can't be resolved (e.g. doesn't
  // exist) — nothing lexically inside a nonexistent root can stat
  // successfully anyway, so the per-ref physical check is skipped and the
  // stat below reports `exists: false` on its own.
  let realRoot: string | undefined;
  try {
    realRoot = await fs.realpath(resolvedRoot);
  } catch {
    realRoot = undefined;
  }

  for (const imagePath of imageReferences) {
    if (images.has(imagePath)) {
      continue;
    }
    if (images.size >= MAX_IMAGE_REFS_PER_FILE) {
      break;
    }

    const fullPath = path.resolve(baseDir, imagePath);
    if (!isInsideRoot(resolvedRoot, fullPath)) {
      images.set(imagePath, { path: imagePath, size: 0, exists: false });
      continue;
    }

    // Physical confinement: a symlink inside the root must also RESOLVE
    // inside the (real) root, or stat would follow it out and leak the
    // target's existence/size. A realpath failure (ENOENT for missing
    // files and dangling links, or any other resolution error) falls
    // through: `fs.stat` resolves the same path the same way, fails
    // identically, and lands in the `exists: false` branch below —
    // missing files keep their exact pre-existing behavior.
    if (realRoot !== undefined) {
      try {
        const realPath = await fs.realpath(fullPath);
        if (!isInsideRoot(realRoot, realPath)) {
          images.set(imagePath, { path: imagePath, size: 0, exists: false });
          continue;
        }
      } catch {
        // Fall through to the stat below.
      }
    }

    try {
      const stats = await fs.stat(fullPath);
      images.set(imagePath, {
        path: imagePath,
        size: stats.size,
        exists: true,
      });
    } catch {
      images.set(imagePath, {
        path: imagePath,
        size: 0,
        exists: false,
      });
    }
  }

  return images.size > 0 ? { images } : undefined;
}
