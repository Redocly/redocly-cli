import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should apply x-security schemes in right order', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'x-security-priority.arazzo.yaml');
  const args = getParams(indexEntryPoint, ['respect', fixturesPath, '--verbose']);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
