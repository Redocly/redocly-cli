import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should evaluate the outputs of a step that calls a workflow', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'workflow-step-outputs.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--workflow',
    'find-ordered-item',
    '--workflow',
    'read-response-in-outputs',
    '--workflow',
    'read-outputs-of-failed-workflow',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
