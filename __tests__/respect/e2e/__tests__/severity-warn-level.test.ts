import { getParams, getCommandOutput, getFixturePath } from './utils';

it('should use warn severity level', () => {
  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('severity-level.yaml'),
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

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
});
