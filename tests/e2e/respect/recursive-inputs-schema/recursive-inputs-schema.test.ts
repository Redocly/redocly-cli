import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should check workflow inputs against a recursive inputs schema', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'recursive-inputs-schema.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--input',
    // the second fallback has no required `search`
    '{"search":"mermaid-treasure-latte","fallback":{"search":"tiramisu","fallback":{}}}',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
