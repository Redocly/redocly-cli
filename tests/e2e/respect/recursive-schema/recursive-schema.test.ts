import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

test('should check a response described with a recursive schema', () => {
  const fixturesPath = join(__dirname, 'recursive-schema.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);

test('should load a description with a recursive schema again for the next file', () => {
  const args = getParams(indexEntryPoint, [
    'respect',
    join(__dirname, 'recursive-schema.arazzo.yaml'),
    // uses the same OpenAPI description
    join(__dirname, 'shared-description.arazzo.yaml'),
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
