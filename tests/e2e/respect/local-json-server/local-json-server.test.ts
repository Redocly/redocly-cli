import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';
import { startServer, stopAndRestore } from './server-process.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'fake-db.json');
const jsonServerPath = createRequire(import.meta.url).resolve('json-server/lib/bin.js');

describe('local-json-server', () => {
  let server: ReturnType<typeof startServer> | undefined;
  let originalData: string | undefined;

  beforeAll(async () => {
    vi.stubEnv('npm_execpath', undefined);
    originalData = fs.readFileSync(dbPath, 'utf8');
    server = startServer(
      process.execPath,
      [jsonServerPath, '--watch', dbPath, '--port', '3000', '--host', '0.0.0.0'],
      'http://localhost:3000/items'
    );
    await server.ready;
  }, 45_000);

  afterAll(async () => {
    try {
      await stopAndRestore(server?.stop, () => {
        if (originalData !== undefined) fs.writeFileSync(dbPath, originalData);
      });
    } finally {
      vi.unstubAllEnvs();
    }
  }, 15_000);

  test('local-json-server test case', () => {
    const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
    const fixturesPath = join(__dirname, 'local-json-server.arazzo.yaml');
    const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

    const result = getCommandOutput(args);
    expect(result).toMatchSnapshot();
  });
});
