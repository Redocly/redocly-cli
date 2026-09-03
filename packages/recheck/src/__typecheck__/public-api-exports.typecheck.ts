// Compile-only regression fixture (NOT a *.test.ts / __tests__ file — those
// are excluded from this package's tsconfig.json `include`, so vitest's
// loose esbuild transpilation would let a broken type-only import pass
// silently; see FIX 2 in the Phase 2 final review). This file's only job is
// to fail `npm run typecheck` if `RecheckConfig` or `ValidationError`
// stop being resolvable from the package's public root (`../index.js`)
// alone — both appear in public signatures (`lintContent`/`lintFiles` take
// a `RecheckConfig`; a rejected `validate()` call reports `ValidationError[]`),
// so a consumer importing only `@redocly/recheck` must be able to name them
// without reaching into internal `../types/*` barrels.
import {
  resolveRecheckConfig,
  runLint,
  generateBaseline,
  runReadability,
  generateMarkdocSchema,
  silentLogger,
  collectingLogger,
  type RecheckBlockInput,
  type RecheckConfig,
  type ResolvedRecheckConfig,
  type ResolveResult,
  type ValidationError,
  type LintOptions,
  type ReadabilityOptions,
  type MarkdocSchemaOptions,
  type Logger,
  type CollectingLogger,
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

export const typedRecheckBlockInput: RecheckBlockInput = {
  extends: ['recheck/markdown'],
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

export const typedLogger: Logger = silentLogger;
export const typedCollectingLogger: CollectingLogger = collectingLogger();

export const typedLintOptions: LintOptions = { format: 'table' };
export const typedRunLint: typeof runLint = runLint;

export const typedGenerateBaseline: typeof generateBaseline = generateBaseline;

export const typedReadabilityOptions: ReadabilityOptions = { format: 'table' };
export const typedRunReadability: typeof runReadability = runReadability;

export const typedMarkdocSchemaOptions: MarkdocSchemaOptions = {
  from: ['./tags.ts'],
  out: './tags.yaml',
};
export const typedGenerateMarkdocSchema: typeof generateMarkdocSchema = generateMarkdocSchema;
