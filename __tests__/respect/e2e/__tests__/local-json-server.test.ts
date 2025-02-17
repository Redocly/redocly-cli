import { getParams, getCommandOutput, getFixturePath } from './utils';

it('local-json-server test case', () => {
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('local-json-server.yaml'),
  ]);
  const result = getCommandOutput(params);
  expect(result).toMatchSnapshot();
});
