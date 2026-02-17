import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should reveal masked input values', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'reveal-masked-input-secrets.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--input',
    '{"username":"John","password":"password","secret": {"secretValue":"secretToken"}}',
    '--no-secrets-masking',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.AUTH_TOKEN;
}, 60_000);
