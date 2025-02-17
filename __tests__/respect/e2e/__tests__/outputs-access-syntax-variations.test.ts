import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should resolve outputs access syntax variations', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('outputs-access-syntax-variations.yaml'),
    '--verbose',
  ]);

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
