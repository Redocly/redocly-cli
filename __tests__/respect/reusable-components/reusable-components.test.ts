import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

test('should use inputs from CLI and env to mapp with resolved refs', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'reusable-components.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--input',
    '{"store_id":"42","my_pet_tags":["one","two"]}',
    '--input',
    'reusable-test="123"',
  ]);
  const result = getCommandOutput(args);

  expect(result).toMatchSnapshot();
});
