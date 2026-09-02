// Compile-only regression fixture (NOT a *.test.ts / __tests__ file — those
// are excluded from this package's tsconfig.json `include`, so vitest's
// loose esbuild transpilation would let a broken type-only import pass
// silently; see FIX 2 in the Phase 2 final review). This file's only job is
// to fail `pnpm exec tsgo --noEmit` if `RecheckConfig` or `ValidationError`
// stop being resolvable from the package's public root (`../index.js`)
// alone — both appear in public signatures (`lintContent`/`lintFiles` take
// a `RecheckConfig`; a rejected `validate()` call reports `ValidationError[]`),
// so a consumer importing only `@redocly/recheck` must be able to name them
// without reaching into internal `../types/*` barrels.
import type { RecheckConfig, ValidationError } from '../index.js';

export const typedConfig: RecheckConfig = {
  'recheck/no-trailing-spaces': {
    severity: 'error',
    message: 'Trailing spaces',
    assertions: { 'no-trailing-spaces': {} },
  },
};

export const typedError: ValidationError = {
  message: 'Unknown assertion type "foo"',
  path: 'rule.assertions.foo',
};
