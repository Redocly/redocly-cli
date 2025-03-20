import { join } from 'node:path';
import { getCommandOutput, getParams } from '../../helpers';

test('free apis test case', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'free.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
