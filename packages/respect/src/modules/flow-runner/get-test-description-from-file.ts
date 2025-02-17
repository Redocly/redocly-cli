import { bold, red } from 'colorette';
import { getTotals, formatProblems, lint, bundle, createConfig } from '@redocly/openapi-core';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { type TestDescription } from '../../types';
import { printConfigLintTotals } from '../../utils/cli-outputs';
import { version } from '../../../package.json';
import { isTestFile } from '../../utils/file';
import { readYaml } from '../../utils/yaml';

export async function bundleArazzo(filePath: string) {
  const fileName = path.basename(filePath);

  if (!fileName) {
    throw new Error('Invalid file name');
  }

  if (!existsSync(filePath)) {
    const relativePath = path.relative(process.cwd(), filePath);
    throw new Error(
      `Could not find source description file '${fileName}' at path '${relativePath}'`,
    );
  }

  const fileContent = await readYaml(filePath);

  if (!isTestFile(fileName, fileContent)) {
    throw new Error(
      `No test files found. File ${fileName} does not follows naming pattern "*.[yaml | yml | json]" or have not valid "Arazzo" description.`,
    );
  }

  const config = await createConfig({
    extends: ['recommended-strict'],
    arazzo1Rules: {
      'no-criteria-xpath': 'error',
      'spot-supported-versions': 'error',
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

    throw new Error(`${red('Invalid file configuration')} ${bold(fileName)}`);
  }

  const bundledDocument = await bundle({
    ref: filePath,
    config,
    dereference: true,
  });

  return (bundledDocument.bundle.parsed || {}) as TestDescription;
}
