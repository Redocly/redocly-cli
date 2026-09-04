import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every built-in generator must be authored EXACTLY the way the AGENTS.md skill
// teaches users' agents — through the public package specifiers an ejected copy
// carries (a tsconfig `paths` entry resolves them to src). Any import outside a
// folder's allowlist is a dogfooding violation; for the language generators it also
// breaks the promise that a python-only selection never loads `typescript`.
//
// The sharing tiers (ADR-0020): the neutral toolkit, the folder's OWN printer —
// never another language's — the runtime sources, and a required generator's
// published contract. Node builtins and `@redocly/openapi-core` (the toolkit's own
// dependency) are platform, not sharing.
const SHARED_SPECIFIERS = [
  '@redocly/client-generator',
  '@redocly/client-generator/runtime-sources',
  '@redocly/openapi-core',
];

const GENERATORS: Array<{ name: string; printer?: string; contracts?: string[] }> = [
  { name: 'python', printer: 'python' },
  { name: 'go', printer: 'go' },
  { name: 'php', printer: 'php' },
  { name: 'typescript', printer: 'typescript' },
  { name: 'zod', printer: 'typescript' },
  { name: 'mock', printer: 'typescript' },
  { name: 'transformers', printer: 'typescript' },
  // The wrappers and the cli code against the typescript SDK's published ABI —
  // the `requires: ['typescript']` edge in the registry.
  { name: 'swr', printer: 'typescript', contracts: ['typescript'] },
  { name: 'tanstack-query', printer: 'typescript', contracts: ['typescript'] },
  { name: 'cli', printer: 'typescript', contracts: ['typescript'] },
];

describe.each(GENERATORS)('$name folder dogfooding invariant', ({ name, printer, contracts }) => {
  it('imports only what the authoring skill offers to any custom generator', () => {
    const folder = resolve(dirname(fileURLToPath(import.meta.url)), '..', name);
    // Top-level stage files only: a `runtime/` subfolder holds the embedded runtime's
    // own sources, which keep their intra-runtime relative imports by design.
    const stageFiles = readdirSync(folder).filter(
      (entry) => entry.endsWith('.ts') && statSync(resolve(folder, entry)).isFile()
    );
    expect(stageFiles.length).toBeGreaterThan(0);
    const allowed = new Set([
      ...SHARED_SPECIFIERS,
      `@redocly/client-generator/printers/${printer}`,
      ...(contracts ?? []).map((required) => `@redocly/client-generator/contracts/${required}`),
    ]);
    for (const file of stageFiles) {
      const source = readFileSync(resolve(folder, file), 'utf-8');
      // Real module imports only — generators also EMIT import lines inside template
      // literals (`'msw'`, `'./runtime/factory.${ext}'`), which are output, not imports.
      const specifiers = [...source.matchAll(/^(?:import|export|\}).* from '([^']+)';$/gm)].map(
        (match) => match[1]
      );
      const violations = specifiers.filter(
        (specifier) =>
          !allowed.has(specifier) &&
          !/^\.\/[a-z-]+\.js$/.test(specifier) &&
          !specifier.startsWith('node:')
      );
      expect(violations, `${name}/${file}`).toEqual([]);
    }
  });
});
