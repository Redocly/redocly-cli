import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should use inputs from CLI and env to mapp with resolved refs', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('reusable-components.yaml'),
    '--verbose',
    '--input',
    '{"store_id":"42","my_pet_tags":["one","two"]}',
    '--input',
    'reusable-test="123"',
  ]);

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
