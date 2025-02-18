import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should use error severity level', () => {
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('severity-level.yaml'),
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

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
