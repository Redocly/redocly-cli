import { cleanColors } from '../../src/utils/clean-colors';
import { getParams, getCommandOutput, getFixturePath } from './utils';

it('cats api test case', () => {
  const params = getParams('../../lib-internal/cli.js', ['run', getFixturePath('auto-cat.yaml')]);
  const result = cleanColors(getCommandOutput(params));

  const lines = result.split('\n'); // Split the result into lines
  const relevantPart = lines.slice(0, 200).join('\n'); // Extract the relevant lines

  expect(relevantPart).toMatchSnapshot();
});
