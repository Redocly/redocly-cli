import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

test('should not follow the default behavior to break and return if onFailure omitted with warn severity and continue execution of the next step', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'consider-severity-in-next-step-execution.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--severity',
    'STATUS_CODE_CHECK=off',
    '--severity',
    'SCHEMA_CHECK=warn',
    '--severity',
    'SUCCESS_CRITERIA_CHECK=warn',
    '--severity',
    'CONTENT_TYPE_CHECK=off',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
