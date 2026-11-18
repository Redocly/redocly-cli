import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should end a retry wait at the execution timeout and run no step after it', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'execution-timeout.arazzo.yaml');
  // the timeout starts before the Cafe description is downloaded, so it leaves time for the first request
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--execution-timeout=5000']);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
