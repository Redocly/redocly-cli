import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should pass inputs to step target workflow with additional input parameter from parent step and remapped, custom_price is expected to be undefined', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(
    __dirname,
    'inputs-passed-to-step-target-workflow-and-remapped.arazzo.yaml'
  );
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--input',
    '{"PROJECT_CLIENT_ID":"0000001","PROJECT_CLIENT_SECRET":"PROJECT_CLIENT_SECRET","PROJECT_SUBSCRIPTION_KEY":"PROJECT_SUBSCRIPTION_KEY"}',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.AUTH_TOKEN;
}, 60_000);
