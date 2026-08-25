import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The pipeline (loadSpec → IR → resolve → run) must not load `typescript`
// unless a TS-emitting generator is actually selected. Built-ins are reached
// only through dynamic imports in generators/meta.js, which this static walk
// deliberately does not follow — so any static leak fails here.
const libDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../lib');

const STATIC_IMPORT = /(?:^|\n)(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g;

function staticGraph(entry: string): { files: Set<string>; externals: Set<string> } {
  const files = new Set<string>();
  const externals = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    const source = readFileSync(file, 'utf-8');
    for (const match of source.matchAll(STATIC_IMPORT)) {
      const specifier = match[1];
      if (specifier.startsWith('.')) {
        queue.push(join(dirname(file), specifier));
      } else {
        externals.add(
          specifier
            .split('/')
            .slice(0, specifier.startsWith('@') ? 2 : 1)
            .join('/')
        );
      }
    }
  }
  return { files, externals };
}

describe('pipeline (lib/pipeline.js)', () => {
  it('statically loads no typescript and no generator folder', () => {
    const { files, externals } = staticGraph(join(libDir, 'pipeline.js'));
    expect(externals.has('typescript')).toBe(false);
    // Built-ins are reached only through the dynamic imports in generators/meta.js —
    // a generator folder in the static graph would load every language's emit stack
    // (and, for the TS family, its printers) on every pipeline start.
    const generatorFiles = [...files].filter((file) => /\/generators\/[a-z-]+\//.test(file));
    expect(generatorFiles).toEqual([]);
  });
});

describe('the sdk generator itself (lib/generators/typescript/index.js)', () => {
  it('loads no typescript — the whole emit path is text templates (setup baking stays lazy)', () => {
    const { externals } = staticGraph(join(libDir, 'generators/typescript/index.js'));
    expect(externals.has('typescript')).toBe(false);
  });
});
