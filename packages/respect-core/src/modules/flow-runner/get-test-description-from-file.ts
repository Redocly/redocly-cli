import { bold, red } from 'colorette';
import {
  getTotals,
  formatProblems,
  lint,
  bundle,
  createConfig,
  type BaseResolver,
  type CollectFn,
  type LoggerInterface,
} from '@redocly/openapi-core';
import * as path from 'node:path';
import { printConfigLintTotals } from '../../utils/cli-outputs.js';
import { isTestFile } from '../../utils/file.js';

type BundleArazzoOptions = {
  filePath: string;
  base?: string;
  externalRefResolver?: BaseResolver;
  collectSpecData?: CollectFn;
  version?: string;
  logger: LoggerInterface;
};

export async function bundleArazzo(options: BundleArazzoOptions) {
  const { filePath, base, externalRefResolver, collectSpecData, version } = options;

  const fileName = path.basename(filePath);

  if (!fileName) {
    throw new Error('Invalid file name');
  }

  const config = await createConfig({
    extends: ['recommended-strict'],
    arazzo1Rules: {
      'no-criteria-xpath': 'error',
      'respect-supported-versions': 'warn',
      'no-x-security-scheme-name-without-openapi': 'error',
      'x-security-scheme-required-values': 'error',
      'no-x-security-scheme-name-in-workflow': 'error',
    },
  });

  const lintProblems = await lint({
    ref: filePath,
    config,
  });

  if (lintProblems.length) {
    const fileTotals = getTotals(lintProblems);

    formatProblems(lintProblems, {
      totals: fileTotals,
      version,
    });

    printConfigLintTotals(fileTotals, options.logger);
  }

  const bundledDocument = await bundle({
    base,
    ref: filePath,
    config,
    dereference: true,
    externalRefResolver,
  });

  if (!bundledDocument) {
    throw new Error(`Could not find source description file '${fileName}'.`);
  }

  if (!isTestFile(fileName, bundledDocument.bundle.parsed)) {
    throw new Error(
      `No test files found. File ${fileName} does not follows naming pattern "*.[yaml | yml | json]" or have not valid "Arazzo" description.`
    );
  }

  collectSpecData?.(bundledDocument.bundle.parsed || {});

  const errorLintProblems = lintProblems.filter((problem) => problem.severity === 'error');
  if (errorLintProblems.length) {
    throw new Error(`${red('Found errors in Arazzo description')} ${bold(fileName)}`);
  }

  return bundledDocument.bundle.parsed || {};
}
