// Compile-only regression fixture (NOT a *.test.ts / __tests__ file — those
// are excluded from this package's tsconfig.json `include`, so this file's
// path is deliberately outside both exclusions). It is never imported or
// executed; its only job is to fail `npm run typecheck` if
// `AssertionConfig` regresses into a closed union that can't represent
// token-rule option shapes (see FIX 1 in the Phase 2 final review).
//
// This guards against TS2353 ("object literal may only specify known
// properties") firing for any of the 53 markdownlint-parity token rules'
// options when a caller writes a typed `RecheckConfig` literal.
import type { RecheckConfig } from '../rules.js';

export const typedConfig: RecheckConfig = {
  'recheck/line-length': {
    severity: 'error',
    message: 'Line length',
    assertions: {
      'line-length': { lineLength: 120 },
    },
  },
  'recheck/no-duplicate-heading': {
    severity: 'error',
    message: 'Multiple headings with the same content',
    assertions: {
      'no-duplicate-heading': { siblingsOnly: true },
    },
  },
};
