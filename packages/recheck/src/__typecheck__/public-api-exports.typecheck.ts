// Type-only check, not run by vitest. `npm run typecheck` fails if a public type
// can no longer be imported from the package root (`../index.js`).
import {
  resolveRecheckConfig,
  runLint,
  generateBaseline,
  runReadability,
  generateMarkdocSchema,
  type RecheckBlock,
  type RecheckBlockInput,
  type RecheckConfig,
  type ResolvedRecheckConfig,
  type ResolveResult,
  type ValidationError,
  type LintOptions,
  type ReadabilityOptions,
  type MarkdocSchemaOptions,
} from '../index.js';

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

export const typedRecheckBlock: RecheckBlock = {
  rules: { 'recheck/line-length': { severity: 'warn' }, 'recheck/no-trailing-spaces': 'off' },
  excludes: ['CHANGELOG.md'],
  markdoc: true,
  apiDescriptions: { rules: { 'recheck/line-length': 'off' } },
};

export const typedRecheckBlockInput: RecheckBlockInput = {
  block: typedRecheckBlock,
  configDir: '/project',
};

export const typedResolvedRecheckConfig: ResolvedRecheckConfig = {
  rules: [],
  configDir: '/project',
  markdoc: false,
  markdocSchema: null,
  descriptionRules: [],
};

export const typedResolveResult: ResolveResult = {
  success: true,
  config: typedResolvedRecheckConfig,
  errors: [],
};

export const typedResolveRecheckConfig: typeof resolveRecheckConfig = resolveRecheckConfig;

export const typedLintOptions: LintOptions = { fix: false };
export const typedRunLint: typeof runLint = runLint;

export const typedGenerateBaseline: typeof generateBaseline = generateBaseline;

export const typedReadabilityOptions: ReadabilityOptions = { changedOnly: false };
export const typedRunReadability: typeof runReadability = runReadability;

export const typedMarkdocSchemaOptions: MarkdocSchemaOptions = {
  from: ['./tags.ts'],
  out: './tags.yaml',
};
export const typedGenerateMarkdocSchema: typeof generateMarkdocSchema = generateMarkdocSchema;
