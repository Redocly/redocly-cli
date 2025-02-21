import { getParams, getCommandOutput, getFixturePath } from '../respect/utils';
import { join } from 'path';

test('rebilly test case', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'rebilly.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
});
