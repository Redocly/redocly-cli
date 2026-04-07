import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should use inputs from CLI and env to map with resolved refs', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'reusable-components.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--input',
    '{"store_id":"42","my_pet_tags":["one","two"]}',
    '--input',
    'reusable-test="123"',
  ]);
  const result = getCommandOutput(args);

  expect(result).toMatchSnapshot();
}, 60_000);
