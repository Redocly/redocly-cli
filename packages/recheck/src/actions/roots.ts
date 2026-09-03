import * as path from 'path';

import { discoverMarkdownFiles } from '../core/files.js';

/** Normalizes an action's root argument: one path, several paths, or none (the current directory). */
export function toRoots(paths: string | string[]): string[] {
  const roots = Array.isArray(paths) ? paths : [paths];
  return roots.length > 0 ? roots : ['.'];
}

/**
 * Discovers markdown files under every root, in root order. Roots may overlap
 * or repeat, so entries are de-duplicated by absolute path and each file is
 * linted, baselined, or scored once.
 */
export async function discoverFilesForRoots(roots: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const root of roots) {
    for (const file of await discoverMarkdownFiles(root)) {
      const absolute = path.resolve(file);
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      files.push(file);
    }
  }
  return files;
}
