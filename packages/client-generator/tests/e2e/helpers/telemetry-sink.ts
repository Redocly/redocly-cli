// An OTLP/HTTP traces endpoint for the usage telemetry tests. It answers the n-th request
// with the n-th status of its list (the last one repeats), and keeps every request body.
// The test decodes each span into its attributes and compares them with what
// @redocly/cli-otel, the owner of the event schema, gives for the expected event.
import { CloudEvents, processCloudEventAttributes } from '@redocly/cli-otel';
import { GENERATOR_VERSION } from '@redocly/client-generator';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from './helpers.js';
import { MockServer } from './mock-server.js';

const fixture = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/base.yaml');

/** The attributes of one span, by key. */
type SpanAttributes = Record<string, string | number>;

type OtlpValue = { stringValue?: string; intValue?: number };
type OtlpRequest = {
  resourceSpans: Array<{
    scopeSpans: Array<{
      spans: Array<{ attributes: Array<{ key: string; value: OtlpValue }> }>;
    }>;
  }>;
};

const OPERATION_PREFIX = 'cloudevents.event_data.operation.';

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

function decode(body: OtlpRequest): SpanAttributes[] {
  const events: SpanAttributes[] = [];
  for (const span of body.resourceSpans[0].scopeSpans[0].spans) {
    const attributes: SpanAttributes = {};
    for (const { key, value } of span.attributes) {
      attributes[key] = value.stringValue ?? value.intValue ?? '';
    }
    events.push(attributes);
  }
  return events;
}

/**
 * The event of two `listPets` calls, the first retried once after a `503`, registered as
 * `@acme/pets-sdk` 1.0.0 by `pets-worker/2.0.0`: the same attributes in every language.
 */
function expectListPetsEvent(sent: SpanAttributes, language: string, runtime: string): void {
  expect(sent['cloudevents.event_id']).toMatch(/^evt_[0-9abcdefghjkmnpqrstvwxyz]{26}$/);
  expect(sent['cloudevents.event_time']).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  expect(typeof sent[`${OPERATION_PREFIX}window_ms`]).toBe('number');
  expect(typeof sent[`${OPERATION_PREFIX}duration_sum_ms`]).toBe('number');
  expect(sent['cloudevents.event_data.sdk.runtime_version']).not.toBe('');

  // The run decides the window, the durations, and so the duration buckets of the calls.
  const latency: SpanAttributes = {};
  let latencyCalls = 0;
  for (const [key, value] of Object.entries(sent)) {
    if (key.startsWith(`${OPERATION_PREFIX}latency_`)) {
      latency[key.slice(OPERATION_PREFIX.length)] = value;
      latencyCalls += Number(value);
    }
  }
  expect(latencyCalls).toBe(2);

  const sdkUri = `urn:redocly:cli:sdk:${language}:@acme/pets-sdk`;
  const event = CloudEvents.mapToCloudEvent({
    type: 'com.redocly.sdkUsage.aggregated',
    source: 'urn:redocly:cli',
    origin: 'redocly-sdk',
    category: 'product',
    signal: 'metric',
    data: [
      {
        id: 'listPets',
        object: 'operation',
        uri: `${sdkUri}:operation:listPets`,
        window_ms: sent[`${OPERATION_PREFIX}window_ms`],
        calls: 2,
        attempts: 3,
        duration_sum_ms: sent[`${OPERATION_PREFIX}duration_sum_ms`],
        status_2xx: 2,
        ...latency,
      },
      {
        id: '@acme/pets-sdk',
        object: 'sdk',
        uri: sdkUri,
        version: '1.0.0',
        generator_version: GENERATOR_VERSION,
        language,
        runtime,
        runtime_version: sent['cloudevents.event_data.sdk.runtime_version'],
        client: 'pets-worker/2.0.0',
      },
    ],
  });
  const expected = processCloudEventAttributes(
    { ...event, id: sent['cloudevents.event_id'] },
    new Date(sent['cloudevents.event_time'])
  );
  // `toEqual` skips the attributes that the mapper leaves undefined, such as `env`.
  expect(sent).toEqual(expected);
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
): Promise<SpanAttributes[][]> {
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
    const requests: SpanAttributes[][] = [];
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
  run: (statuses: number[], env?: Record<string, string>) => Promise<SpanAttributes[][]>,
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
    expect(requests[1][0]['cloudevents.event_time']).toBe(requests[0][0]['cloudevents.event_time']);
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
