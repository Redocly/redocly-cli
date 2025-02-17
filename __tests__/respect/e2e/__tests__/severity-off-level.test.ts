import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should use off severity level', () => {
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('severity-level.yaml'),
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

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
