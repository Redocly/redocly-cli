import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should use inputs from CLI and env', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('inputs-with-cli-and-env.yaml'),
    '--verbose',
    '--input',
    '{"username":"John","password":"password"}',
  ]);

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
