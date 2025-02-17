import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should send in request and proceed case-insensitive headers in runtime expressions', () => {
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('case-insensitive-headers.yaml'),
  ]);
  const result = getCommandOutput(params);
  expect(result).toMatchSnapshot();
});
