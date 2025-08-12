import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('should resolve securitySchemes described in x-security by schemeName', () => {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const fixturesPath = join(__dirname, 'x-security-resolve-scheme-name.arazzo.yaml');
  const args = getParams(indexEntryPoint, [
    'respect',
    fixturesPath,
    '--verbose',
    '--input',
    'secret="some-password"',
  ]);

  const result = getCommandOutput(args);
  expect(result).toMatchSnapshot();
}, 60_000);
