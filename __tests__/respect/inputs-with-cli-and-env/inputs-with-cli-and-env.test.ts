import { join } from 'node:path';
import { getCommandOutput, getParams } from '../../helpers';

test('should use inputs from CLI and env', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'inputs-with-cli-and-env.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--input',
    '{"username":"John","password":"password"}',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.AUTH_TOKEN;
}, 60_000);
