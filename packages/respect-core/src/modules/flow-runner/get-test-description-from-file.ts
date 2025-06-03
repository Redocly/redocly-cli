import { bold, red } from 'colorette';
import { getTotals, formatProblems, lint, bundle, createConfig } from '@redocly/openapi-core';
import { type CollectFn } from '@redocly/openapi-core';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { printConfigLintTotals } from '../../utils/cli-outputs.js';
import { isTestFile } from '../../utils/file.js';
import { readYaml } from '../../utils/yaml.js';
import { version } from '../../utils/package.js';

export async function bundleArazzo(filePath: string, collectSpecData?: CollectFn) {
  const fileName = path.basename(filePath);

  if (!fileName) {
    throw new Error('Invalid file name');
  }

  if (!existsSync(filePath)) {
    const relativePath = path.relative(process.cwd(), filePath);
    throw new Error(
      `Could not find source description file '${fileName}' at path '${relativePath}'`
    );
  }

  const fileContent = await readYaml(filePath);

  if (!isTestFile(fileName, fileContent)) {
    throw new Error(
      `No test files found. File ${fileName} does not follows naming pattern "*.[yaml | yml | json]" or have not valid "Arazzo" description.`
    );
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

    printConfigLintTotals(fileTotals);
  }

  const bundledDocument = await bundle({
    ref: filePath,
    config,
    dereference: true,
  });

  collectSpecData?.(bundledDocument.bundle.parsed || {});

  const errorLintProblems = lintProblems.filter((problem) => problem.severity === 'error');
  if (errorLintProblems.length) {
    throw new Error(`${red('Found errors in Arazzo description')} ${bold(fileName)}`);
  }

  return bundledDocument.bundle.parsed || {};
}
