import { getCommandOutput, getParams } from '../../helpers';
import { join } from 'node:path';

test('should resolve outputs access syntax variations', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'outputs-access-syntax-variations.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--verbose']);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
