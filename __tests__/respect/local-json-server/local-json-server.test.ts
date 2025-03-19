import { spawn } from 'child_process';
import { join } from 'node:path';
import * as fs from 'node:fs';
import { getCommandOutput, getParams } from '../../helpers';

const dbPath = join(__dirname, 'fake-db.json');

describe('local-json-server', () => {
  let serverProcess: any;
  let originalData: string | undefined;

  beforeAll(async () => {
    // Start json-server
    serverProcess = spawn('npm', ['run', 'json-server'], { detached: true });

    // Store original state of fake-bd.json
    originalData = fs.readFileSync(dbPath, 'utf8');
  });

  afterAll(() => {
    // Kill the process group to ensure child processes are cleaned up
    process.kill(-serverProcess.pid);

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
