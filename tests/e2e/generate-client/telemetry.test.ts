/**
 * Behavioral e2e for `client.telemetry: on`: generate a client with it, register the
 * middleware with a custom sink in a real consumer, and read what the sink receives.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { generateInto, runConsumer, strictTypecheck } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');

describe('client.telemetry: on', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'telemetry-'));
    writeFileSync(join(dir, 'redocly.yaml'), 'client:\n  telemetry: on\n', 'utf-8');
    generateInto(dir, fixture, ['--config', join(dir, 'redocly.yaml')]);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('emits client.telemetry.ts, and the sink receives one event per operation', () => {
    expect(readdirSync(dir)).toContain('client.telemetry.ts');
    const result = runConsumer(
      dir,
      outdent`
        import { configure, use, listPets } from './client.js';
        import { telemetry, flush, type SdkUsageEvent } from './client.telemetry.js';

        const received: SdkUsageEvent[] = [];
        configure({
          fetch: (async () =>
            new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch,
        });
        use(
          telemetry({
            sdkName: '@acme/pets-sdk',
            sdkVersion: '1.0.0',
            client: 'pets-worker/2.0.0',
            sink: (events) => {
              received.push(...events);
            },
          })
        );
        await listPets();
        await listPets();
        await flush();
        console.log(JSON.stringify({ received }));
      `
    ) as {
      received: Array<{
        type: string;
        data: { usage: Record<string, unknown>; sdk: Record<string, unknown> };
      }>;
    };

    expect(result.received.length).toBe(1);
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
    strictTypecheck(dir, ['client.ts', 'client.telemetry.ts', 'consumer.ts']);
  }, 60_000);
});
