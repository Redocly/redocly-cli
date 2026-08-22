import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The python generator is the flywheel's proof: it must be authored EXACTLY the
// way the AGENTS.md skill teaches users' agents — with the language-neutral
// toolkit only, through the SAME package specifiers an ejected copy carries (a
// tsconfig `paths` entry resolves them to src). Any import outside this allowlist
// (in particular the TS emitter toolkit) is a dogfooding violation, and also breaks
// the promise that a python-only selection never loads the `typescript` package.
const SHARED_SPECIFIERS = [
  '@redocly/client-generator', // the neutral toolkit + the IR types + the generator contract
  '@redocly/client-generator/runtime-sources', // pure embedded strings, generated at prepare time
];

describe.each(['python', 'go', 'php'])('%s folder dogfooding invariant', (language) => {
  it('imports only what the authoring skill offers to any custom generator', () => {
    const folder = resolve(dirname(fileURLToPath(import.meta.url)), '..', language);
    const stageFiles = readdirSync(folder).filter((name) => name.endsWith('.ts'));
    expect(stageFiles.length).toBeGreaterThan(0);
    // A generator's sharing tiers (ADR-0020): the neutral toolkit, its OWN language
    // printer — never another language's — the runtime sources, and its own stage files.
    const allowed = new Set([
      ...SHARED_SPECIFIERS,
      `@redocly/client-generator/printers/${language}`,
    ]);
    for (const name of stageFiles) {
      const source = readFileSync(resolve(folder, name), 'utf-8');
      const specifiers = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
      const violations = specifiers.filter(
        (specifier) => !allowed.has(specifier) && !/^\.\/[a-z-]+\.js$/.test(specifier)
      );
      expect(violations, name).toEqual([]);
    }
  });
});
