import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

test('should implicitly add content type header based on requestBody.content field (the first one) if such does not specified', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'implicit.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '-w=implicit-content-type',
    '--verbose',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
});
