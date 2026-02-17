import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should execute successActions for each workflow step if it does not have onSuccess action itself', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'workflow-failure-actions.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
