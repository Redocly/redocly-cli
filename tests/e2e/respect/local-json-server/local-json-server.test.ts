import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'fake-db.json');
const jsonServerPath = createRequire(import.meta.url).resolve('json-server/lib/bin.js');

describe('local-json-server', () => {
  let serverProcess: ChildProcess | undefined;
  let serverClosed: Promise<void> | undefined;
  let startupError: Error | undefined;
  let originalData: string | undefined;

  beforeAll(async () => {
    originalData = fs.readFileSync(dbPath, 'utf8');
    serverProcess = spawn(
      process.execPath,
      [jsonServerPath, '--watch', dbPath, '--port', '3000', '--host', '0.0.0.0'],
      { stdio: 'ignore' }
    );
    serverClosed = new Promise<void>((resolve) => {
      serverProcess!.once('close', () => resolve());
      serverProcess!.once('error', (error) => {
        startupError = error;
        resolve();
      });
    });

    const deadline = Date.now() + 30_000;
    for (;;) {
      if (startupError) throw startupError;
      if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
        throw new Error('json-server exited before becoming ready');
      }
      try {
        const response = await fetch('http://localhost:3000/items', {
          signal: AbortSignal.timeout(1_000),
        });
        await response.arrayBuffer();
        if (response.ok) break;
      } catch {
        // Not listening yet.
      }
      if (Date.now() > deadline) throw new Error('json-server did not become ready within 30s');
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }, 40_000);

  afterAll(async () => {
    try {
      if (serverProcess && serverClosed) {
        if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
          serverProcess.kill('SIGTERM');
        }
        const escalation = setTimeout(() => serverProcess?.kill('SIGKILL'), 5_000);
        let deadline: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            serverClosed,
            new Promise<never>((_, reject) => {
              deadline = setTimeout(
                () => reject(new Error('json-server did not close within 10s')),
                10_000
              );
            }),
          ]);
        } finally {
          clearTimeout(escalation);
          clearTimeout(deadline);
        }
      }
    } finally {
      if (originalData !== undefined) fs.writeFileSync(dbPath, originalData);
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
