import { parse } from 'node:path';

/**
 * Derive the directory and base name (stem, without `.ts`) from the `--output`
 * anchor path. Generators build sibling-file paths from these.
 */
export function anchor(outputPath: string): { dir: string; stem: string } {
  const { dir, name } = parse(outputPath);
  return { dir, stem: name };
}
