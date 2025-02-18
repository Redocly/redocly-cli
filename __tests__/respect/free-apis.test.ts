import { join } from 'path';
import { getParams, getCommandOutput, getFixturePath } from './utils';

it('free apis test case', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  // const fixturesPath = join(__dirname, 'case-insensitive-headers/case-insensitive-headers.yaml');
  // const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  // const result = getCommandOutput(args);
  // expect(result).toMatchSnapshot();

  const params = getParams(indexEntryPoint, ['respect', getFixturePath('free.yaml')]);
  const result = getCommandOutput(params);
  expect(result).toMatchSnapshot();
});
