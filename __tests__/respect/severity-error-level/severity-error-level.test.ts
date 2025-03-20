import { getCommandOutput, getParams } from '../../helpers';
import { join } from 'node:path';

test('should use error severity level', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'severity-level.arazzo.yaml');
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
}, 60_000);
