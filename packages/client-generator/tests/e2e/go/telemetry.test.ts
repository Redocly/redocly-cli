import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer } from '../helpers/helpers.js';
import { describeTelemetryRuns, runTelemetryConsumer } from '../helpers/telemetry-sink.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let workDir = '';

describe("generate-client go generator, telemetry: 'on' against a local OTLP sink", () => {
  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer-telemetry'));
    await generateClient({
      api: join(__dirname, '../fixtures/base.yaml'),
      output: join(workDir, 'client/client.ts'),
      generators: ['go'],
      telemetry: 'on',
    });
    const build = spawnSync('go', ['build', '-o', 'telemetry', '.'], {
      cwd: workDir,
      encoding: 'utf-8',
    });
    if (build.status !== 0) throw new Error(build.stderr);
  }, 180_000);

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('telemetry.go is gofmt-clean and go vet-clean', () => {
    const format = spawnSync('gofmt', ['-l', join(workDir, 'client/telemetry.go')], {
      encoding: 'utf-8',
    });
    expect(format.stdout, 'files gofmt would change').toBe('');
    const vet = spawnSync('go', ['vet', './client'], { cwd: workDir, encoding: 'utf-8' });
    expect(vet.status, vet.stderr).toBe(0);
  });

  describeTelemetryRuns(
    (statuses, env) =>
      runTelemetryConsumer(
        join(workDir, 'telemetry'),
        (serverUrl, sinkUrl) => [serverUrl, sinkUrl],
        statuses,
        env
      ),
    'go',
    'go'
  );
});
