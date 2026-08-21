import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The python generator is the flywheel's proof: it must be authored EXACTLY the
// way the AGENTS.md skill teaches users' agents — with the language-neutral
// toolkit only. Any import outside this allowlist (in particular the TS emitter
// toolkit) is a dogfooding violation, and also breaks the promise that a
// python-only selection never loads the `typescript` package.
const ALLOWED_SPECIFIERS = new Set([
  '../../authoring/index.js',
  '../../emitters/python-runtime-sources.js', // pure embedded strings, generated at prepare time
  '../../emitters/go-runtime-sources.js',
  '../../emitters/php-runtime-sources.js',
  '../../intermediate-representation/model.js', // type-only IR shapes
  '../types.js', // the generator contract
]);

describe.each(['python/index.ts', 'go/index.ts', 'php/index.ts'])(
  '%s dogfooding invariant',
  (file) => {
    it('imports only what the authoring skill offers to any custom generator', () => {
      const source = readFileSync(
        resolve(dirname(fileURLToPath(import.meta.url)), '..', file),
        'utf-8'
      );
      const specifiers = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
      expect(specifiers.length).toBeGreaterThan(0);
      const violations = specifiers.filter((specifier) => !ALLOWED_SPECIFIERS.has(specifier));
      expect(violations).toEqual([]);
    });
  }
);
