import { getParams, getCommandOutput, getFixturePath } from './utils';

it('free apis test case', () => {
  const params = getParams('../../lib-internal/cli.js', ['run', getFixturePath('free.yaml')]);
  const result = getCommandOutput(params);
  expect(result).toMatchSnapshot();
});
