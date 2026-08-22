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

// Emitter modules the IR legitimately shares (identifier/name sanitizing) — all
// pure string/data helpers with no `typescript` import. Anything else from
// emitters/ appearing in the pipeline graph is a leak.
const PURE_EMITTER_HELPERS = new Set([
  'auth.js',
  'identifier.js',
  'pagination.js',
  'reserved-names.js',
  'runtime-sources.js',
  'sse.js',
  'support.js',
]);

describe('pipeline (lib/pipeline.js)', () => {
  it('statically loads no typescript and only the pure emitter helpers', () => {
    const { files, externals } = staticGraph(join(libDir, 'pipeline.js'));
    expect(externals.has('typescript')).toBe(false);
    const emitterFiles = [...files]
      .filter((file) => /\/emitters\//.test(file))
      .map((file) => file.split('/emitters/')[1])
      .filter((name) => !PURE_EMITTER_HELPERS.has(name));
    expect(emitterFiles).toEqual([]);
  });
});

describe('the sdk generator itself (lib/generators/typescript/index.js)', () => {
  it('loads no typescript — the whole emit path is text templates (setup baking stays lazy)', () => {
    const { externals } = staticGraph(join(libDir, 'generators/typescript/index.js'));
    expect(externals.has('typescript')).toBe(false);
  });
});
