import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

const specPrefixes = ['oas', 'async', 'openrpc', 'spec-', 'draft4', 'null-schema', 'xml-'];

/** Checks if a folder name belongs to the spec-validation category. */
function isSpecTest(folder: string): boolean {
  return specPrefixes.some((prefix) => folder.startsWith(prefix));
}

describe('lint spec validation', () => {
  const contents = readdirSync(__dirname).filter(isSpecTest);

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
