import { getParams, getCommandOutput, getFixturePath } from './utils';

it('rebilly test case', () => {
  const params = getParams('../../lib-internal/cli.js', ['run', getFixturePath('rebilly.yaml')]);
  const result = getCommandOutput(params);
  expect(result).toMatchSnapshot();
});
