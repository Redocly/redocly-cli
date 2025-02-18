import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

it('should use error severity level', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'severity-level.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--severity',
    'STATUS_CODE_CHECK=error',
    '--severity',
    'SCHEMA_CHECK=error',
    '--severity',
    'SUCCESS_CRITERIA_CHECK=error',
    '--severity',
    'CONTENT_TYPE_CHECK=error',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
});
