import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

test('should quit an infinite loop on RESPECT_MAX_STEPS', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--workflow',
    'infinite',
  ]);

  const result = getCommandOutput(args, {
    RESPECT_MAX_STEPS: '10',
  });

  expect(result).toMatchSnapshot();
});
