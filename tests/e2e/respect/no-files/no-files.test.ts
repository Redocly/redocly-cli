import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

test('should ask for a file when the command is run without one', () => {
  const args = getParams(indexEntryPoint, ['respect']);

  const result = getCommandOutput(args, { testPath: __dirname });
  expect(result).toMatchSnapshot();
});
