import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

const excludeFolders = [
  'arazzo-type-extensions-with-plugin',
  'arazzo-not-valid-test-description',
  'arazzo-valid-test-description',
];

const coveredPrefixes = [
  'assertion',
  'no-invalid',
  'operation-',
  'oas',
  'async',
  'openrpc',
  'spec-',
  'draft4',
  'null-schema',
  'xml-',
];

/** Checks if a folder is already covered by another contextual test file. */
function isCoveredElsewhere(folder: string): boolean {
  return coveredPrefixes.some((prefix) => folder.startsWith(prefix));
}

describe('lint rules', () => {
  const contents = readdirSync(__dirname)
    .filter((folder) => !excludeFolders.includes(folder))
    .filter((folder) => !isCoveredElsewhere(folder));

  for (const file of contents) {
    const testPath = join(__dirname, file);
    if (statSync(testPath).isFile()) continue;
    if (!existsSync(join(testPath, 'redocly.yaml'))) continue;

    const args = getParams(indexEntryPoint, ['lint']);

    test(file, async () => {
      const result = getCommandOutput(args, { testPath });
      await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
    });
  }
});
