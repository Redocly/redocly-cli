import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describeTelemetryRuns, runTelemetryConsumer } from '../helpers/telemetry-sink.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let workDir = '';

describe("generate-client python generator, telemetry: 'on' against a local OTLP sink", () => {
  beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'python-telemetry-'));
    await generateClient({
      api: join(__dirname, '../fixtures/base.yaml'),
      output: join(workDir, 'client.ts'),
      generators: ['python'],
      telemetry: 'on',
    });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('the telemetry module passes mypy --strict', () => {
    const result = spawnSync(
      'python3',
      ['-m', 'mypy', '--strict', '--no-incremental', join(workDir, 'client_telemetry.py')],
      { encoding: 'utf-8' }
    );
    expect(result.status, result.stdout).toBe(0);
  });

  describeTelemetryRuns(
    (statuses, env) =>
      runTelemetryConsumer(
        'python3',
        (serverUrl, sinkUrl) => [
          join(__dirname, 'consumer/telemetry.py'),
          workDir,
          serverUrl,
          sinkUrl,
        ],
        statuses,
        env
      ),
    'python',
    'cpython'
  );
});
