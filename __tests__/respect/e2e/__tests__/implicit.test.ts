import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should implicitly add content type header based on requestBody.content field (the first one) if such does not specified', () => {
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('implicit.yaml'),
    '-w=implicit-content-type',
    '--verbose',
  ]);
  const result = getCommandOutput(params);
  expect(result).toMatchSnapshot();
});
