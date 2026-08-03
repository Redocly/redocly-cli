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
    serverProcess = spawn('npm', ['run', 'json-server'], { detached: true });

    // Store original state of fake-bd.json
    originalData = fs.readFileSync(dbPath, 'utf8');

    // Wait until the server actually accepts connections — spawning is not readiness,
    // and the workflow run starts immediately after (ECONNREFUSED race otherwise).
    const deadline = Date.now() + 30_000;
    for (;;) {
      try {
        const response = await fetch('http://localhost:3000/items');
        if (response.ok) break;
      } catch {
        // not listening yet
      }
      if (Date.now() > deadline) throw new Error('json-server did not become ready within 30s');
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }, 40_000);

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
