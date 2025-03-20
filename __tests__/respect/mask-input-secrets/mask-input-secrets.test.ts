import { getCommandOutput, getParams } from '../../helpers';
import { join } from 'node:path';

test('should hide sensitive input values', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'mask-input-secrets.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--input',
    '{"username":"John","password":"password","secret": {"secretValue":"secretToken"}}',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.AUTH_TOKEN;
}, 60_000);
