import { join } from 'path';
import { getCommandOutput, getParams } from '../utils';

test('should send in request and proceed case-insensitive headers in runtime expressions', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'case-insensitive-headers.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
});
