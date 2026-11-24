import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should load an Arazzo source again after its workflow has run', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const args = getParams(indexEntryPoint, [
    'respect',
    // calls the workflow from menu.arazzo.yaml directly, then through middle.arazzo.yaml
    join(__dirname, 'arazzo-source-loaded-twice.arazzo.yaml'),
    // loads the same file once more, as a file to run
    join(__dirname, 'menu.arazzo.yaml'),
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
