import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The python generator is the flywheel's proof: it must be authored EXACTLY the
// way the AGENTS.md skill teaches users' agents — with the language-neutral
// toolkit only. Any import outside this allowlist (in particular the TS emitter
// toolkit) is a dogfooding violation, and also breaks the promise that a
// python-only selection never loads the `typescript` package.
const SHARED_SPECIFIERS = [
  '../../authoring/index.js',
  '../../emitters/python-runtime-sources.js', // pure embedded strings, generated at prepare time
  '../../emitters/go-runtime-sources.js',
  '../../emitters/php-runtime-sources.js',
  '../../intermediate-representation/model.js', // type-only IR shapes
  '../types.js', // the generator contract
];

describe.each(['python', 'go', 'php'])('%s/index.ts dogfooding invariant', (language) => {
  it('imports only what the authoring skill offers to any custom generator', () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '..', language, 'index.ts'),
      'utf-8'
    );
    // A generator's sharing tiers (ADR-0020): the neutral toolkit, its OWN language
    // printer — never another language's — the runtime sources, and the contract.
    const allowed = new Set([...SHARED_SPECIFIERS, `../../printers/${language}.js`]);
    const specifiers = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    const violations = specifiers.filter((specifier) => !allowed.has(specifier));
    expect(violations).toEqual([]);
  });
});
