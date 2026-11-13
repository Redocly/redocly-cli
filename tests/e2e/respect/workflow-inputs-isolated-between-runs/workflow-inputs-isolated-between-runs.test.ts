import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should not leak inputs passed to a local workflow into its later runs', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'workflow-inputs-isolated-between-runs.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--verbose']);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
