import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

// Snapshot is intentionally should show failed request to museum-api-bad-endpoint
test('should use server override from CLI and env', () => {
  process.env.AUTH_TOKEN = 'Basic Og==';
  process.env.REDOCLY_CLI_RESPECT_SERVER =
    'museum-api=https://museum-api-bad-endpoint.com/museum-api-bad-endpoint,tickets-from-museum-api=https://redocly.com/_mock/docs/openapi/museum-api';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'server-override-with-console-parameters.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--verbose']);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.AUTH_TOKEN;
  delete process.env.REDOCLY_CLI_RESPECT_SERVER;
});
