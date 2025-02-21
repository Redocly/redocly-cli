import { join } from 'path';
import { getParams, getCommandOutput, getFixturePath, cleanColors } from '../utils';

test('cats api test case', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'auto-cat.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);
  const result = cleanColors(getCommandOutput(args));

  const lines = result.split('\n'); // Split the result into lines
  const relevantPart = lines.slice(0, 200).join('\n'); // Extract the relevant lines

  expect(relevantPart).toMatchSnapshot();
});
