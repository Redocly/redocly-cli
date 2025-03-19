import { join } from 'node:path';
import { getCommandOutput, getParams } from '../../helpers';
import { cleanColors } from '../utils';

test('cats api test case', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'auto-cat.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);
  const result = cleanColors(getCommandOutput(args));

  const lines = result.split('\n'); // Split the result into lines
  const relevantPart = lines.slice(0, 200).join('\n'); // Extract the relevant lines

  expect(relevantPart).toMatchSnapshot();
}, 60_000);
