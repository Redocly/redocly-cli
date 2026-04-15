import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('lint assertions', () => {
  const contents = readdirSync(__dirname).filter((folder) => folder.startsWith('assertion'));

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
