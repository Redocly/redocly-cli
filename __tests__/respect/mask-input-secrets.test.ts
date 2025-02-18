import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should hide sensitive input values', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('mask-input-secrets.yaml'),
    '--verbose',
    '--input',
    '{"username":"John","password":"password","secret": {"secretValue":"secretToken"}}',
  ]);

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
