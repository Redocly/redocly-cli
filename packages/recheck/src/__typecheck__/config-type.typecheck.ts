// Compile-only regression fixture (NOT a *.test.ts / __tests__ file — those
// are excluded from this package's tsconfig.json `include`, so vitest's
// loose esbuild transpilation would let a broken type narrow silently; see
// public-api-exports.typecheck.ts in this same directory for the same
// reasoning). This file's only job is to fail `npm run typecheck` if
// `RecheckConfig` regresses from a template-literal index signature back to
// a wide one that admits engine-key typos or non-object rule values.
import type { RecheckConfig } from '../types/rules.js';

export const scalarRuleValue: RecheckConfig = {
  // @ts-expect-error -- a rule entry must be a Partial<BaseRule> object, not a bare severity string
  'recheck/line-length': 'error',
};

export const misspelledEngineKey: RecheckConfig = {
  // @ts-expect-error -- 'extend' is not a declared engine key and has no '/', so it can't be a rule name either
  extend: ['recheck/markdown'],
};

export const ruleKeyNoSlash: RecheckConfig = {
  // @ts-expect-error -- rule names always contain a '/' (namespace/rule); a slash-less key matches no property
  'line-length': {},
};

export const okConfig: RecheckConfig = {
  extends: ['recheck/markdown'],
  'recheck/line-length': {},
};
