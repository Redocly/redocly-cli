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
 * Runs `fn` over `items` with at most `limit` calls at once. Results are in the same order as
 * `items`. Recheck is published on its own, so it cannot use @redocly/shared's promiseMapLimit.
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

/** Whether any rule uses `max-image-size`, which needs image metadata from disk. */
export function needsImageMetadata(rules: NormalizedRule[]): boolean {
  return rules.some((rule) => Object.keys(rule.assertions).includes('max-image-size'));
}

/**
 * Returns the local (not `http(s)://`) image paths in `content`, from inline and reference-style
 * images. It uses the same `getImageDestinations` as `max-image-size`, so the paths match the
 * keys that `loadImageMetadata` stores. Markdoc parsing is off here, because it does not change
 * where images start or end.
 */
function extractImageReferences(content: string): string[] {
  return getImageDestinations(parseMarkdown(content))
    .map(({ destination }) => destination)
    .filter(
      (destination) => !destination.startsWith('http://') && !destination.startsWith('https://')
    );
}

/**
 * Most unique image refs checked per file, to limit the number of `fs.stat` calls. Refs past the
 * limit are left out of the metadata instead of being marked as missing.
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
 * Loads size and existence for the images in a markdown file, keyed by the path as written.
 *
 * Refs are limited to `root` (default `process.cwd()`). A ref that leaves it, by `../` or an
 * absolute path, is marked as missing without being checked, so a document cannot probe other
 * files. Symlinks are followed only if they resolve inside the root.
 *
 * At most `MAX_IMAGE_REFS_PER_FILE` unique refs are checked. The rest are left out, so
 * `max-image-size` skips them instead of reporting them as missing.
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

  // The root's real path, resolved once. `undefined` if the root does not exist.
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

    // Follow symlinks, and reject any that end up outside the root. If the path cannot be
    // resolved, the `fs.stat` below reports it as missing.
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
