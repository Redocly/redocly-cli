import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Snapshot intentionally shows a failed request to cafe-api-bad-endpoint
test('should use server override from CLI and env', () => {
  process.env.REDOCLY_CLI_RESPECT_SERVER =
    'cafe-api=https://cafe-api-bad-endpoint.com/cafe-api-bad-endpoint,menu-from-cafe-api=https://api.cafe.redocly.com';

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'server-override-with-console-parameters.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--verbose']);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();

  delete process.env.REDOCLY_CLI_RESPECT_SERVER;
}, 60_000);
