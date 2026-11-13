import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const fixturesPath = join(__dirname, 'allow-additional-properties.arazzo.yaml');

test('should fail the schema check on response properties that the schema does not describe', () => {
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);

test('should accept response properties that the schema does not describe with --allow-additional-properties', () => {
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--allow-additional-properties',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
