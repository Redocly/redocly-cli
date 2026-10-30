import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer } from '../helpers/helpers.js';
import { describeTelemetryRuns, runTelemetryConsumer } from '../helpers/telemetry-sink.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let workDir = '';

describe("generate-client php generator, telemetry: 'on' against a local OTLP sink", () => {
  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer-telemetry'));
    await generateClient({
      api: join(__dirname, '../fixtures/base.yaml'),
      output: join(workDir, 'client/client.ts'),
      generators: ['php'],
      telemetry: 'on',
    });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('telemetry.php passes php -l and PHPStan level 5', () => {
    const telemetryFile = join(workDir, 'client/telemetry.php');
    const lint = spawnSync('php', ['-l', telemetryFile], { encoding: 'utf-8' });
    expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
    const analyse = spawnSync(
      'phpstan',
      ['analyse', '--no-progress', '--level=5', '--memory-limit=1G', telemetryFile],
      { encoding: 'utf-8' }
    );
    expect(analyse.status, `${analyse.stdout}\n${analyse.stderr}`).toBe(0);
  });

  describeTelemetryRuns(
    (statuses, env) =>
      runTelemetryConsumer(
        'php',
        (serverUrl, sinkUrl) => [join(workDir, 'telemetry.php'), serverUrl, sinkUrl],
        statuses,
        env
      ),
    'php',
    'php'
  );
});
