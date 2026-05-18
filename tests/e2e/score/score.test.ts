import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('score', () => {
  const folderPath = __dirname;

  test('score should produce correct stylish output', async () => {
    const testPath = join(folderPath, 'score-stylish');
    const args = getParams(indexEntryPoint, ['score', 'museum.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('score should produce correct JSON output', async () => {
    const testPath = join(folderPath, 'score-json');
    const args = getParams(indexEntryPoint, ['score', 'museum.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('score should produce correct output for minimal API', async () => {
    const testPath = join(folderPath, 'score-minimal');
    const args = getParams(indexEntryPoint, ['score', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'snapshot.txt'));
  });

  test('score should include agent prompts when --suggestions', async () => {
    const snapshotPath = join(folderPath, 'score-suggestions', 'snapshot.txt');
    const args = getParams(indexEntryPoint, ['score', 'museum.yaml', '--suggestions']);
    const result = getCommandOutput(args, { testPath: join(folderPath, 'score-stylish') });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(snapshotPath);
  });
});
