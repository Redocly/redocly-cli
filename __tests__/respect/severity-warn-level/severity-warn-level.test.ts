import { getCommandOutput, getParams } from '../../helpers';
import { join } from 'node:path';

test('should use warn severity level', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'severity-level.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--severity',
    'STATUS_CODE_CHECK=warn',
    '--severity',
    'SCHEMA_CHECK=warn',
    '--severity',
    'SUCCESS_CRITERIA_CHECK=warn',
    '--severity',
    'CONTENT_TYPE_CHECK=warn',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
