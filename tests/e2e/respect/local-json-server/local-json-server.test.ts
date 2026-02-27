import { spawn } from 'child_process';
import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'fake-db.json');

describe('local-json-server', () => {
  let serverProcess: any;
  let originalData: string | undefined;

  beforeAll(async () => {
    // Start json-server
    serverProcess = spawn('pnpm', ['run', 'json-server'], { detached: true });

    // Store original state of fake-bd.json
    originalData = fs.readFileSync(dbPath, 'utf8');
  });

  afterAll(() => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', serverProcess.pid.toString(), '/f', '/t']);
      } else {
        spawn('kill', ['-TERM', `-${serverProcess.pid}`]);
      }
    } catch (error) {
      try {
        serverProcess.kill('SIGTERM');
      } catch (e) {
        // Process may have already exited
      }
    }

    // Restore original state
    if (originalData) {
      fs.writeFileSync(dbPath, originalData);
    }
  });

  test('local-json-server test case', () => {
    const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
    const fixturesPath = join(__dirname, 'local-json-server.arazzo.yaml');
    const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

    const result = getCommandOutput(args);
    expect(result).toMatchSnapshot();
  });
});
