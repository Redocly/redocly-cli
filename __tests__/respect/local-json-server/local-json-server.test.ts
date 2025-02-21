import { spawn } from 'child_process';
import { getParams, getCommandOutput } from '../utils';
import { join } from 'path';

describe('local-json-server', () => {
  let serverProcess: any;

  beforeAll(async () => {
    // Start json-server
    serverProcess = spawn('npm', ['run', 'json-server'], { detached: true });
  });

  afterAll(() => {
    // Kill the process group to ensure child processes are cleaned up
    process.kill(-serverProcess.pid);
  });

  test('local-json-server test case', () => {
    const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
    const fixturesPath = join(__dirname, 'local-json-server.yaml');
    const args = getParams(indexEntryPoint, ['respect', fixturesPath]);

    const result = getCommandOutput(args);
    expect(result).toMatchSnapshot();
  });
});
