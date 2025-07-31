import { blue, gray } from 'colorette';
import { performance } from 'perf_hooks';
import { extname } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  formatProblems,
  getTotals,
  lint,
  lintConfig,
  pluralize,
  ConfigValidationError,
  logger,
} from '@redocly/openapi-core';
import { parseProtoFile, protoToOpenAPI } from '../utils/proto-parser.js';
import {
  checkIfRulesetExist,
  formatPath,
  getExecutionTime,
  getFallbackApisOrExit,
  handleError,
  printConfigLintTotals,
  printLintTotals,
  printUnusedWarnings,
} from '../utils/miscellaneous.js';
import { AbortFlowError, exitWithError } from '../utils/error.js';
import { getCommandNameFromArgs } from '../utils/get-command-name-from-args.js';

import type { ParsedProto } from '../utils/proto-parser.js';
import type { Arguments } from 'yargs';
import type { Config, Exact, OutputFormat } from '@redocly/openapi-core';
import type { CommandArgv, Totals, VerifyConfigOptions } from '../types.js';
import type { CommandArgs } from '../wrapper.js';

export type LintArgv = {
  apis?: string[];
  'max-problems': number;
  extends?: string[];
  format: OutputFormat;
  'generate-ignore-file'?: boolean;
  'skip-rule'?: string[];
  'skip-preprocessor'?: string[];
} & VerifyConfigOptions;

export async function handleLint({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<LintArgv>) {
  const apis = await getFallbackApisOrExit(argv.apis, config);

  if (!apis.length) {
    exitWithError('No APIs were provided.');
  }

  if (argv['generate-ignore-file']) {
    config.ignore = {}; // clear ignore
  }
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  let totalIgnored = 0;

  // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
  for (const { path, alias } of apis) {
    try {
      const startedAt = performance.now();
      const aliasConfig = config.forAlias(alias);

      checkIfRulesetExist(aliasConfig.rules);

      aliasConfig.skipRules(argv['skip-rule']);
      aliasConfig.skipPreprocessors(argv['skip-preprocessor']);

      if (typeof config.document?.parsed === 'undefined') {
        logger.info(
          `No configurations were provided -- using built in ${blue(
            'recommended'
          )} configuration by default.\n\n`
        );
      }
      logger.info(gray(`validating ${formatPath(path)}...\n`));

      let results: any[] = [];

      // Handle .proto files
      if (extname(path).toLowerCase() === '.proto') {
        logger.info('Detected Protocol Buffers file, using custom parser...\n');
        try {
          const proto = parseProtoFile(path);
          logger.info('Successfully parsed Protocol Buffers file...\n');
          const openapi = protoToOpenAPI(proto);
          logger.info('Successfully converted to OpenAPI format...\n');

          // For Protocol Buffers files, we'll use our custom validation
          // The core linting system expects OpenAPI/AsyncAPI formats
          logger.info('Running Protocol Buffers-specific validation...\n');
          const protoProblems = validateProtoFile(proto, path);
          logger.info(`Found ${protoProblems.length} Protocol Buffers validation issues.\n`);
          results = protoProblems;
          collectSpecData?.(openapi);
        } catch (parseError) {
          logger.error(`Error parsing Protocol Buffers file: ${parseError}\n`);
          throw parseError;
        }
      } else {
        // Handle regular OpenAPI files
        results = await lint({
          ref: path,
          config: aliasConfig,
          collectSpecData,
        });
      }

      const fileTotals = getTotals(results);
      totals.errors += fileTotals.errors;
      totals.warnings += fileTotals.warnings;
      totals.ignored += fileTotals.ignored;

      if (argv['generate-ignore-file']) {
        for (const m of results) {
          config.addIgnore(m);
          totalIgnored++;
        }
      } else {
        // For Protocol Buffers files, use JSON format by default to avoid codeframe issues
        const outputFormat = argv.format === 'codeframe' ? 'json' : argv.format;
        formatProblems(results, {
          format: outputFormat,
          maxProblems: argv['max-problems'],
          totals: fileTotals,
          version,
        });
      }

      const elapsed = getExecutionTime(startedAt);
      logger.info(gray(`${formatPath(path)}: validated in ${elapsed}\n\n`));
    } catch (e) {
      handleError(e, path);
    }
  }

  if (argv['generate-ignore-file']) {
    config.saveIgnore();
    logger.info(
      `Generated ignore file with ${totalIgnored} ${pluralize('problem', totalIgnored)}.\n\n`
    );
  } else {
    printLintTotals(totals, apis.length);
  }

  printUnusedWarnings(config);

  if (!(totals.errors === 0 || argv['generate-ignore-file'])) {
    throw new AbortFlowError('Lint failed.');
  }
}

export async function handleLintConfig(argv: Exact<CommandArgv>, version: string, config: Config) {
  if (argv['lint-config'] === 'off' || config.document === undefined) {
    return;
  }

  if (argv.format === 'json') {
    // we can't print config lint results as it will break json output
    return;
  }

  const command = argv ? getCommandNameFromArgs(argv as Arguments) : undefined;

  const problems = await lintConfig({
    config,
    severity: argv['lint-config'] || 'warn',
  });

  const fileTotals = getTotals(problems);

  formatProblems(problems, {
    format: argv.format,
    maxProblems: argv['max-problems'],
    totals: fileTotals,
    version,
  });

  printConfigLintTotals(fileTotals, command);

  if (fileTotals.errors > 0) {
    throw new ConfigValidationError();
  }
}

function validateProtoFile(proto: ParsedProto, filePath: string): any[] {
  const problems: any[] = [];
  const fileContent = readFileSync(filePath, 'utf-8');

  // Create a proper Source object with required methods
  const mockSource = {
    absoluteRef: filePath,
    getLines: () => fileContent.split('\n'),
    getAst: () => ({
      kind: 0, // YAMLNode.Kind.SCALAR
      value: '',
      startPosition: 1,
      endPosition: 1,
    }),
  };

  // Basic validation rules for Protocol Buffers

  // Check if package is defined
  if (!proto.package) {
    problems.push({
      message: 'Protocol Buffers file should have a package declaration',
      location: [{ source: mockSource, pointer: '#/' }],
      severity: 'warn',
      ruleId: 'proto-package-required',
    });
  }

  // Check for duplicate field numbers in messages
  proto.messages.forEach((message) => {
    const fieldNumbers = new Set<number>();
    message.fields.forEach((field) => {
      if (fieldNumbers.has(field.number)) {
        problems.push({
          message: `Duplicate field number ${field.number} in message ${message.name}`,
          location: [{ source: mockSource, pointer: '#/' }],
          severity: 'error',
          ruleId: 'proto-duplicate-field-number',
        });
      }
      fieldNumbers.add(field.number);
    });
  });

  // Check for duplicate enum values
  proto.enums.forEach((enumDef) => {
    const enumNumbers = new Set<number>();
    enumDef.values.forEach((value) => {
      if (enumNumbers.has(value.number)) {
        problems.push({
          message: `Duplicate enum value ${value.number} in enum ${enumDef.name}`,
          location: [{ source: mockSource, pointer: '#/' }],
          severity: 'error',
          ruleId: 'proto-duplicate-enum-value',
        });
      }
      enumNumbers.add(value.number);
    });
  });

  // Check for services with methods
  proto.services.forEach((service) => {
    if (service.methods.length === 0) {
      problems.push({
        message: `Service ${service.name} has no methods defined`,
        location: [{ source: mockSource, pointer: '#/' }],
        severity: 'warn',
        ruleId: 'proto-service-no-methods',
      });
    }
  });

  return problems;
}
