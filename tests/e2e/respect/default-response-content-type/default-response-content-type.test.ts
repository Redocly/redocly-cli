import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should check the content type of a response described by the default response', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'default-response-content-type.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
