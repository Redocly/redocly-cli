import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

it('should use off severity level', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'severity-level.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--severity',
    'STATUS_CODE_CHECK=off',
    '--severity',
    'SCHEMA_CHECK=off',
    '--severity',
    'SUCCESS_CRITERIA_CHECK=off',
    '--severity',
    'CONTENT_TYPE_CHECK=off',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
});
