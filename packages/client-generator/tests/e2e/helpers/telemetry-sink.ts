// An OTLP/HTTP traces endpoint for the usage telemetry tests. It answers the n-th request
// with the n-th status of its list (the last one repeats), and keeps every request body.
// The test decodes each body back into the events the TypeScript telemetry module would
// hand a sink.
import { GENERATOR_VERSION } from '@redocly/client-generator';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from './helpers.js';
import { MockServer } from './mock-server.js';

const fixture = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/base.yaml');

type UsageEvent = {
  type: string;
  source: string;
  time: string;
  usage: Record<string, string | number>;
  sdk: Record<string, string>;
};

type OtlpValue = { stringValue?: string; intValue?: number };
type OtlpRequest = {
  resourceSpans: Array<{
    scopeSpans: Array<{
      spans: Array<{ attributes: Array<{ key: string; value: OtlpValue }> }>;
    }>;
  }>;
};

// The keys every event carries in every language, in the TypeScript module's order.
const EVENT_ATTRIBUTE_KEYS = [
  'cloudevents.event_id',
  'cloudevents.event_type',
  'cloudevents.event_source',
  'cloudevents.event_spec_version',
  'cloudevents.event_data_content_type',
  'cloudevents.event_time',
  'cloudevents.event_subject',
  'cloudevents.event_origin',
  'cloudevents.event_object',
  'cloudevents.event_category',
  'cloudevents.event_signal',
];
const USAGE_KEYS = ['operation_id', 'window_ms', 'calls', 'attempts', 'duration_sum_ms'];
const SDK_KEYS = [
  'name',
  'version',
  'generator_version',
  'language',
  'runtime',
  'runtime_version',
  'client',
];

class TelemetrySink {
  /** The body of each request, in arrival order. */
  readonly requests: string[] = [];

  private constructor(
    private readonly server: http.Server,
    statuses: number[]
  ) {
    server.on('request', (request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        this.requests.push(Buffer.concat(chunks).toString('utf-8'));
        const status = statuses[Math.min(this.requests.length, statuses.length) - 1];
        response.writeHead(status).end();
      });
    });
  }

  static async start(statuses: number[]): Promise<TelemetrySink> {
    const server = http.createServer();
    const sink = new TelemetrySink(server, statuses);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return sink;
  }

  get url(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/v1/traces`;
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

function decode(body: OtlpRequest): UsageEvent[] {
  const events: UsageEvent[] = [];
  for (const span of body.resourceSpans[0].scopeSpans[0].spans) {
    const keys: string[] = [];
    const event: UsageEvent = { type: '', source: '', time: '', usage: {}, sdk: {} };
    for (const { key, value } of span.attributes) {
      const decoded = value.stringValue ?? value.intValue ?? '';
      if (key.startsWith('cloudevents.event_data.usage.')) {
        event.usage[key.slice('cloudevents.event_data.usage.'.length)] = decoded;
      } else if (key.startsWith('cloudevents.event_data.sdk.')) {
        event.sdk[key.slice('cloudevents.event_data.sdk.'.length)] = String(decoded);
      } else {
        keys.push(key);
      }
      if (key === 'cloudevents.event_type') event.type = String(decoded);
      if (key === 'cloudevents.event_source') event.source = String(decoded);
      if (key === 'cloudevents.event_time') event.time = String(decoded);
    }
    expect(keys.sort()).toEqual([...EVENT_ATTRIBUTE_KEYS].sort());
    events.push(event);
  }
  return events;
}

/**
 * The event of two `listPets` calls, the first retried once after a `503`, registered as
 * `@acme/pets-sdk` 1.0.0 by `pets-worker/2.0.0`: the same shape in every language.
 */
function expectListPetsEvent(event: UsageEvent, language: string, runtime: string): void {
  expect(event.type).toBe('com.redocly.sdkUsage.aggregated');
  expect(event.source).toBe('@acme/pets-sdk');
  expect(event.time).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);

  const outcomeKeys = Object.keys(event.usage).filter(
    (key) => key.startsWith('status_') || key.startsWith('latency_')
  );
  expect(Object.keys(event.usage).sort()).toEqual([...USAGE_KEYS, ...outcomeKeys].sort());
  expect(event.usage).toMatchObject({
    operation_id: 'listPets',
    calls: 2,
    attempts: 3,
    status_2xx: 2,
  });
  let latencyCalls = 0;
  for (const key of outcomeKeys) {
    if (key.startsWith('latency_')) latencyCalls += Number(event.usage[key]);
  }
  expect(latencyCalls).toBe(2);
  expect(typeof event.usage.window_ms).toBe('number');
  expect(typeof event.usage.duration_sum_ms).toBe('number');

  expect(Object.keys(event.sdk).sort()).toEqual([...SDK_KEYS].sort());
  expect(event.sdk).toMatchObject({
    name: '@acme/pets-sdk',
    version: '1.0.0',
    generator_version: GENERATOR_VERSION,
    language,
    runtime,
    client: 'pets-worker/2.0.0',
  });
  expect(event.sdk.runtime_version).not.toBe('');
}

/**
 * Run a consumer that registers the telemetry module, calls `listPets` twice, and flushes.
 * The API answers the first `listPets` attempt with `503`, so the client retries it once.
 * `args` gets the API URL and the sink URL; the sink answers with `statuses`.
 */
export async function runTelemetryConsumer(
  command: string,
  args: (serverUrl: string, sinkUrl: string) => string[],
  statuses: number[],
  env: Record<string, string> = {}
): Promise<UsageEvent[][]> {
  let listPetsAttempts = 0;
  const server = await MockServer.start(fixture, {
    handlers: {
      listPets: ({ defaultResponse }) => {
        listPetsAttempts += 1;
        return listPetsAttempts === 1 ? { status: 503 } : defaultResponse();
      },
    },
  });
  const sink = await TelemetrySink.start(statuses);
  try {
    const result = await runCommand(command, args(server.url, sink.url), {
      // The developer's own opt-out must not decide the result.
      env: { ...process.env, REDOCLY_SDK_TELEMETRY: '', DO_NOT_TRACK: '', ...env },
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(server.handlerErrors).toEqual([]);
    const requests: UsageEvent[][] = [];
    for (const body of sink.requests) {
      requests.push(decode(JSON.parse(body)));
    }
    return requests;
  } finally {
    await server.close();
    await sink.close();
  }
}

/** The three runs every language test makes: a kept send, a dropped send, and the opt-out. */
export function describeTelemetryRuns(
  run: (statuses: number[], env?: Record<string, string>) => Promise<UsageEvent[][]>,
  language: string,
  runtime: string
): void {
  it('keeps the counts of a send answered 503 and sends them again with the same window', async () => {
    const requests = await run([503, 200]);
    expect(requests).toHaveLength(2);
    for (const events of requests) {
      expect(events).toHaveLength(1);
      expectListPetsEvent(events[0], language, runtime);
    }
    expect(requests[1][0].time).toBe(requests[0][0].time);
  });

  it('drops the counts of a send answered 400', async () => {
    const requests = await run([400]);
    expect(requests).toHaveLength(1);
  });

  it('sends nothing with REDOCLY_SDK_TELEMETRY=off', async () => {
    const requests = await run([200], { REDOCLY_SDK_TELEMETRY: 'off' });
    expect(requests).toEqual([]);
  });
}
