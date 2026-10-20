/**
 * Behavioral e2e for `telemetry: 'on'`: generate a client with it, register the
 * middleware with a custom sink in a real consumer, and read what the sink receives.
 */
import { generateClient } from '@redocly/client-generator';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectStrictTscPasses, runConsumer } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/base.yaml');

describe("telemetry: 'on'", () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts'), telemetry: 'on' });
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('emits client.telemetry.ts, and the sink receives one event per operation', async () => {
    expect(readdirSync(dir)).toContain('client.telemetry.ts');
    const result = (await runConsumer(join(dir, 'sink.ts'))) as {
      received: Array<{
        type: string;
        data: { usage: Record<string, unknown>; sdk: Record<string, unknown> };
      }>;
    };

    expect(result.received).toHaveLength(1);
    expect(result.received[0].type).toBe('com.redocly.sdkUsage.aggregated');
    expect(result.received[0].data.usage).toMatchObject({
      operation_id: 'listPets',
      calls: 2,
      attempts: 2,
      status_2xx: 2,
    });
    expect(result.received[0].data.sdk).toMatchObject({
      name: '@acme/pets-sdk',
      client: 'pets-worker/2.0.0',
      language: 'typescript',
    });
    expectStrictTscPasses(dir, ['client.ts', 'client.telemetry.ts', 'sink.ts']);
  });
});
