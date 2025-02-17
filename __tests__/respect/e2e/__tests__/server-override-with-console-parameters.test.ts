import { getParams, getCommandOutput, getFixturePath } from './utils';

// Snapshot is intentionally should show failed request to museum-api-bad-endpoint
it('should use server override from CLI and env', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';
  process.env.REDOCLY_CLI_RESPECT_SERVER =
    'museum-api=https://museum-api-bad-endpoint.com/museum-api-bad-endpoint,tickets-from-museum-api=https://redocly.com/_mock/docs/openapi/museum-api';

  const params = getParams('../../lib-internal/cli.js', [
    'run',
    getFixturePath('server-override-with-console-parameters.yaml'),
    '--verbose',
  ]);

  const result = getCommandOutput(params);

  expect(result).toMatchSnapshot();
  delete process.env.AUTH_TOKEN;
  delete process.env.REDOCLY_CLI_RESPECT_SERVER;
});
