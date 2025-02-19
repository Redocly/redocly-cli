import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

test('should resolve outputs access syntax variations', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'outputs-access-syntax-variations.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--verbose']);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.AUTH_TOKEN;
});
