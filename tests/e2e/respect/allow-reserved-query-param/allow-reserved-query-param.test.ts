import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function normalizeHttpbinOutput(output: string): string {
  return output
    .replace(/"X-Amzn-Trace-Id": "Root=[^"]+"/g, '"X-Amzn-Trace-Id": "<trace-id>"')
    .replace(/"origin": "\d+\.\d+\.\d+\.\d+"/g, '"origin": "<origin>"');
}

test('should leave reserved chars unencoded in query when allowReserved is true', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'allow-reserved-query-param.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--verbose']);

  const result = getCommandOutput(args);
  expect(normalizeHttpbinOutput(result)).toMatchSnapshot();
}, 60_000);
