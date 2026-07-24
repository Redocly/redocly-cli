import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Package-mode clients import the package ROOT at app runtime, and native ESM loads
// every static import eagerly — so the root entry's static graph must stay free of the
// generation stack (`typescript`, `@redocly/openapi-core`, Node builtins). It is
// reached only through the dynamic `import('./generate.js')` inside `generateClient`,
// which this walk deliberately does not follow.
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
      if (specifier.startsWith('.')) queue.push(join(dirname(file), specifier));
      else externals.add(specifier);
    }
  }
  return { files, externals };
}

describe('package root entry (lib/index.js)', () => {
  it('statically loads only the runtime — no typescript, openapi-core, or Node builtins', () => {
    const { files, externals } = staticGraph(join(libDir, 'index.js'));
    expect([...externals]).toEqual([]);
    const outsideRuntime = [...files].filter(
      (file) => file.includes('/emitters/') || file.includes('/intermediate-representation/')
    );
    expect(outsideRuntime).toEqual([]);
  });
});
