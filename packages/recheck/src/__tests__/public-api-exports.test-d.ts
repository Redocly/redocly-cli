// The import itself is the main check: it stops compiling when the package root drops a public name.
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

describe('recheck public API', () => {
  it('exports the config block and rule types', () => {
    const block: RecheckBlock = {
      rules: { 'recheck/line-length': { severity: 'warn' }, 'recheck/no-trailing-spaces': 'off' },
      excludes: ['CHANGELOG.md'],
      markdoc: true,
      apiDescriptions: { rules: { 'recheck/line-length': 'off' } },
    };

    assertType<RecheckBlockInput>({ block, configDir: '/project' });
    assertType<RecheckConfig>({
      'recheck/no-trailing-spaces': {
        severity: 'error',
        message: 'Trailing spaces',
        assertions: { 'no-trailing-spaces': {} },
      },
    });
  });

  it('exports resolveRecheckConfig with its result types', () => {
    const config: ResolvedRecheckConfig = {
      rules: [],
      configDir: '/project',
      markdoc: false,
      markdocSchema: null,
      descriptionRules: [],
    };
    const error: ValidationError = {
      message: 'Unknown assertion type "foo"',
      path: 'rule.assertions.foo',
    };

    expectTypeOf(resolveRecheckConfig).returns.resolves.toEqualTypeOf<ResolveResult>();
    assertType<ResolveResult>({ success: true, config, errors: [] });
    assertType<ResolveResult>({ success: false, errors: [error] });
  });

  it('exports the commands with their option types', () => {
    expectTypeOf(runLint).toBeFunction();
    expectTypeOf(generateBaseline).toBeFunction();
    expectTypeOf(runReadability).toBeFunction();
    expectTypeOf(generateMarkdocSchema).toBeFunction();
    assertType<LintOptions>({ fix: false });
    assertType<ReadabilityOptions>({ changedOnly: false });
    assertType<MarkdocSchemaOptions>({ from: ['./tags.ts'], out: './tags.yaml' });
  });
});
