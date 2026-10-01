// Type-only check, not run by vitest. `npm run typecheck` fails if `RecheckConfig`
// starts accepting misspelled engine keys or rule values that are not objects.
import type { RecheckConfig } from '../types/rules.js';

export const scalarRuleValue: RecheckConfig = {
  // @ts-expect-error -- a rule entry must be an object, not a severity string
  'recheck/line-length': 'error',
};

export const misspelledEngineKey: RecheckConfig = {
  // @ts-expect-error -- 'extend' is not an engine key and has no '/', so it is not a rule name
  extend: ['recheck/markdown'],
};

export const ruleKeyNoSlash: RecheckConfig = {
  // @ts-expect-error -- rule names contain a '/' (namespace/rule)
  'line-length': {},
};

export const okConfig: RecheckConfig = {
  extends: ['recheck/markdown'],
  'recheck/line-length': {},
};
