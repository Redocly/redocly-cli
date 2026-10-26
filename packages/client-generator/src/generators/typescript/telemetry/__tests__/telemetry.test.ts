import type { Middleware, RequestContext, SettledCall } from '../../../../runtime-contract.js';
import type { SdkUsageEvent } from '../telemetry.js';

const CLI_ATTRIBUTE_NAMES = [
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
  'cloudevents.event_data.usage.operation_id',
  'cloudevents.event_data.usage.window_ms',
  'cloudevents.event_data.usage.calls',
  'cloudevents.event_data.usage.attempts',
  'cloudevents.event_data.usage.duration_sum_ms',
  'cloudevents.event_data.usage.status_2xx',
  'cloudevents.event_data.usage.latency_lt_100ms',
  'cloudevents.event_data.sdk.name',
  'cloudevents.event_data.sdk.version',
  'cloudevents.event_data.sdk.generator_version',
  'cloudevents.event_data.sdk.language',
  'cloudevents.event_data.sdk.runtime',
  'cloudevents.event_data.sdk.runtime_version',
  'cloudevents.event_data.sdk.client',
];

type OtlpSpan = {
  traceId: string;
  spanId: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: Record<string, unknown> }>;
};
type OtlpRequest = {
  resourceSpans: Array<{
    resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
    scopeSpans: Array<{ spans: OtlpSpan[] }>;
  }>;
};

const identity = { sdkName: '@acme/billing-sdk', sdkVersion: '3.2.0', client: 'worker/1.8.4' };

async function loadTelemetry() {
  vi.resetModules();
  return import('../telemetry.js');
}

function context(operationId: string): RequestContext {
  return {
    url: 'https://api.example.com/x',
    method: 'GET',
    headers: {},
    operation: { id: operationId, path: '/x', tags: [] },
  };
}

function settle(middleware: Middleware, operationId: string, call: SettledCall) {
  return middleware.onSettled!(context(operationId), call);
}

function sinkSpy() {
  const windows: SdkUsageEvent[][] = [];
  const sink = (events: SdkUsageEvent[]) => {
    windows.push(events);
  };
  return { windows, sink };
}

describe('telemetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T09:14:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('counts a call that ends with a network error, a timeout, or an abort in its own status class', async () => {
    const { telemetry, flush } = await loadTelemetry();
    const { windows, sink } = sinkSpy();
    const middleware = telemetry({ ...identity, sink });
    await settle(middleware, 'getOrder', {
      error: new TypeError('fetch failed'),
      attempts: 2,
      durationMs: 20,
    });
    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    await settle(middleware, 'getOrder', { error: timeout, attempts: 1, durationMs: 5000 });
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    await settle(middleware, 'getOrder', { error: abort, attempts: 0, durationMs: 0 });
    await flush();
    expect(windows[0][0].data.usage).toMatchObject({
      calls: 3,
      attempts: 3,
      status_network_error: 1,
      status_timeout: 1,
      status_aborted: 1,
      latency_lt_100ms: 2,
      latency_lt_10s: 1,
    });
  });

  it('sends one event per operation when the window ends, then starts from zero', async () => {
    const { telemetry } = await loadTelemetry();
    const { windows, sink } = sinkSpy();
    const middleware = telemetry({ ...identity, sink });
    const ok = { response: new Response(null, { status: 200 }), attempts: 1, durationMs: 10 };
    await settle(middleware, 'getOrder', ok);
    await settle(middleware, 'getOrder', ok);
    await settle(middleware, 'listOrders', ok);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(windows).toHaveLength(1);
    expect(windows[0][0].time).toBe('2026-10-20T09:14:00.000Z');
    expect(windows[0][0].data.usage.window_ms).toBe(60_000);
    expect(
      windows[0].map((event) => [event.data.usage.operation_id, event.data.usage.calls])
    ).toEqual([
      ['getOrder', 2],
      ['listOrders', 1],
    ]);

    await settle(middleware, 'getOrder', ok);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(windows[1].map((event) => event.data.usage.calls)).toEqual([1]);
  });

  it('sends nothing for an empty window and starts no timer while idle', async () => {
    const { telemetry, flush } = await loadTelemetry();
    const { windows, sink } = sinkSpy();
    telemetry({ ...identity, sink });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(180_000);
    await flush();
    expect(windows).toEqual([]);
  });

  it('counts nothing and sends nothing when a kill switch is set', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    for (const [name, value] of [
      ['REDOCLY_SDK_TELEMETRY', 'off'],
      ['DO_NOT_TRACK', '1'],
    ]) {
      vi.unstubAllEnvs();
      vi.stubEnv(name, value);
      const { telemetry, flush } = await loadTelemetry();
      const middleware = telemetry(identity);
      expect(middleware.onSettled).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
      await flush();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends nothing when a kill switch is set after the middleware is created', async () => {
    const { telemetry, flush } = await loadTelemetry();
    const { windows, sink } = sinkSpy();
    const middleware = telemetry({ ...identity, sink });
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });
    vi.stubEnv('REDOCLY_SDK_TELEMETRY', 'off');
    await flush();
    expect(windows).toEqual([]);
  });

  it('does nothing in a browser, also when the bundle adds a process shim', async () => {
    vi.stubGlobal('document', {});
    const { telemetry } = await loadTelemetry();
    expect(telemetry(identity).onSettled).toBeUndefined();
  });

  it('flush() waits for a send that the window timer started', async () => {
    const { telemetry, flush } = await loadTelemetry();
    let finishSend = () => {};
    const slowSink = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSend = resolve;
        })
    );
    const middleware = telemetry({ ...identity, sink: slowSink });
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(slowSink).toHaveBeenCalledTimes(1);

    let flushed = false;
    const flushing = flush().then(() => {
      flushed = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(flushed).toBe(false);
    finishSend();
    await flushing;
    expect(flushed).toBe(true);
  });
});

describe('telemetry failed send', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T09:14:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Each entry is the status of one send, or the error that fetch throws.
  // After the list ends, each send gets status 200.
  function fetchAnswers(answers: Array<number | Error>) {
    const bodies: OtlpRequest[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(init.body as string));
        const answer = answers[bodies.length - 1] ?? 200;
        if (answer instanceof Error) throw answer;
        return new Response(null, { status: answer });
      })
    );
    return bodies;
  }

  const USAGE_PREFIX = 'cloudevents.event_data.usage.';

  function sentUsage(body: OtlpRequest): Array<Record<string, unknown>> {
    const usages: Array<Record<string, unknown>> = [];
    for (const span of body.resourceSpans[0].scopeSpans[0].spans) {
      const usage: Record<string, unknown> = {};
      for (const attribute of span.attributes) {
        if (attribute.key === 'cloudevents.event_time') {
          usage.time = attribute.value.stringValue;
        } else if (attribute.key.startsWith(USAGE_PREFIX)) {
          const name = attribute.key.slice(USAGE_PREFIX.length);
          usage[name] = attribute.value.intValue ?? attribute.value.stringValue;
        }
      }
      usages.push(usage);
    }
    return usages;
  }

  it('adds the counts of a window that gets 429 into the next window', async () => {
    const bodies = fetchAnswers([429]);
    const { telemetry } = await loadTelemetry();
    const middleware = telemetry(identity);
    for (let index = 0; index < 40; index++) {
      await settle(middleware, 'getInvoice', {
        response: new Response(null, { status: 200 }),
        attempts: 1,
        durationMs: 10,
      });
    }
    await vi.advanceTimersByTimeAsync(60_000);
    expect(bodies).toHaveLength(1);

    for (let index = 0; index < 35; index++) {
      await settle(middleware, 'getInvoice', {
        response: new Response(null, { status: 500 }),
        attempts: 2,
        durationMs: 500,
      });
    }
    await vi.advanceTimersByTimeAsync(60_000);

    expect(bodies).toHaveLength(2);
    expect(sentUsage(bodies[1])).toEqual([
      {
        time: '2026-10-20T09:14:00.000Z',
        operation_id: 'getInvoice',
        window_ms: 120_000,
        calls: 75,
        attempts: 110,
        duration_sum_ms: 17_900,
        status_2xx: 40,
        status_5xx: 35,
        latency_lt_100ms: 40,
        latency_lt_1s: 35,
      },
    ]);
  });

  it.each([
    ['fetch throws', new TypeError('connect ECONNREFUSED')],
    ['fetch aborts for a reason other than the send timeout', new DOMException('', 'AbortError')],
    ['the endpoint answers 408', 408],
    ['the endpoint answers 500', 500],
  ])('keeps the counts and sends them one interval later when %s', async (_case, answer) => {
    const bodies = fetchAnswers([answer]);
    const { telemetry } = await loadTelemetry();
    const middleware = telemetry(identity);
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(bodies).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(bodies).toHaveLength(2);
    expect(sentUsage(bodies[1])).toMatchObject([
      { time: '2026-10-20T09:14:00.000Z', window_ms: 120_000, calls: 1 },
    ]);
  });

  it.each([
    ['the send times out', new DOMException('The operation timed out.', 'TimeoutError')],
    ['the endpoint answers 403', 403],
    ['the endpoint answers 413', 413],
  ])('drops the counts and sends no later copy when %s', async (_case, answer) => {
    const bodies = fetchAnswers([answer]);
    const { telemetry, flush } = await loadTelemetry();
    const middleware = telemetry(identity);
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(120_000);
    await flush();
    expect(bodies).toHaveLength(1);
  });

  it('a failed application flush() keeps its counts for the next send', async () => {
    const bodies = fetchAnswers([429]);
    const { telemetry, flush } = await loadTelemetry();
    const middleware = telemetry(identity);
    const ok = { response: new Response(null, { status: 200 }), attempts: 1, durationMs: 10 };
    await settle(middleware, 'getOrder', ok);
    await expect(flush()).resolves.toBeUndefined();
    expect(bodies).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(30_000);
    await settle(middleware, 'getOrder', ok);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(bodies).toHaveLength(2);
    expect(sentUsage(bodies[1])).toMatchObject([
      { time: '2026-10-20T09:14:00.000Z', window_ms: 60_000, calls: 2 },
    ]);
  });

  it('sends nothing when a kill switch is set after a failed send', async () => {
    const bodies = fetchAnswers([500]);
    const { telemetry, flush } = await loadTelemetry();
    const middleware = telemetry(identity);
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    vi.stubEnv('REDOCLY_SDK_TELEMETRY', 'off');
    await vi.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(bodies).toHaveLength(1);
  });

  it('tries one send at beforeExit and loses the counts without an unhandled rejection', async () => {
    const bodies = fetchAnswers([429, 429]);
    const unhandledRejection = vi.fn();
    process.on('unhandledRejection', unhandledRejection);
    let beforeExit = () => {};
    vi.spyOn(process, 'on').mockImplementation((event: string | symbol, listener: () => void) => {
      if (event === 'beforeExit') beforeExit = listener;
      return process;
    });
    const { telemetry } = await loadTelemetry();
    const middleware = telemetry(identity);
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });

    beforeExit();
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 10));
    // Node emits `beforeExit` again when the failed send ends.
    beforeExit();
    await new Promise((resolve) => setTimeout(resolve, 10));
    process.off('unhandledRejection', unhandledRejection);

    expect(bodies).toHaveLength(1);
    expect(unhandledRejection).not.toHaveBeenCalled();
  });

  it('keeps one counter set per operation in use after ten failed windows', async () => {
    const bodies = fetchAnswers([503, 503, 503, 503, 503, 503, 503, 503, 503, 503]);
    const { telemetry } = await loadTelemetry();
    const middleware = telemetry(identity);
    const ok = { response: new Response(null, { status: 200 }), attempts: 1, durationMs: 10 };
    for (let window = 0; window < 10; window++) {
      await settle(middleware, 'getOrder', ok);
      await settle(middleware, 'listOrders', ok);
      await vi.advanceTimersByTimeAsync(60_000);
    }
    await vi.advanceTimersByTimeAsync(60_000);

    expect(bodies).toHaveLength(11);
    for (const body of bodies) {
      expect(body.resourceSpans[0].scopeSpans[0].spans).toHaveLength(2);
    }
    expect(sentUsage(bodies[10])).toMatchObject([
      { operation_id: 'getOrder', calls: 10, window_ms: 660_000 },
      { operation_id: 'listOrders', calls: 10, window_ms: 660_000 },
    ]);
  });
});

describe('telemetry default sink', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function fetchSpy() {
    const bodies: OtlpRequest[] = [];
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        urls.push(url);
        bodies.push(JSON.parse(init.body as string));
        return new Response(null, { status: 200 });
      })
    );
    return { bodies, urls };
  }

  it('posts OTLP/JSON spans with the collector attribute names under service.name redocly-sdk', async () => {
    const { bodies, urls } = fetchSpy();
    const { telemetry, flush } = await loadTelemetry();
    const middleware = telemetry(identity);
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });
    await flush();

    expect(urls).toEqual(['https://otel.cloud.redocly.com/v1/traces']);
    const resourceSpans = bodies[0].resourceSpans[0];
    expect(resourceSpans.resource.attributes).toEqual([
      { key: 'service.name', value: { stringValue: 'redocly-sdk' } },
      { key: 'service.version', value: { stringValue: 'dev' } },
    ]);
    const spans = resourceSpans.scopeSpans[0].spans;
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('event.com.redocly.sdkUsage.aggregated');
    expect(spans[0].startTimeUnixNano).toBe(spans[0].endTimeUnixNano);
    expect(spans[0].attributes.map((attribute) => attribute.key)).toEqual(CLI_ATTRIBUTE_NAMES);
    const values = new Map<string, unknown>();
    for (const attribute of spans[0].attributes) values.set(attribute.key, attribute.value);
    expect(values.get('cloudevents.event_data_content_type')).toEqual({
      stringValue: 'application/json; charset=utf-8',
    });
    expect(values.get('cloudevents.event_origin')).toEqual({ stringValue: 'redocly-sdk' });
    expect(values.get('cloudevents.event_category')).toEqual({ stringValue: 'product' });
    expect(values.get('cloudevents.event_signal')).toEqual({ stringValue: 'metric' });
    expect(JSON.stringify(spans[0])).not.toContain('api.example.com');
  });

  it('posts to the endpoint option when it is set', async () => {
    const { urls } = fetchSpy();
    const { telemetry, flush } = await loadTelemetry();
    const middleware = telemetry({ ...identity, endpoint: 'http://localhost:4318/v1/traces' });
    await settle(middleware, 'getOrder', {
      response: new Response(null, { status: 200 }),
      attempts: 1,
      durationMs: 10,
    });
    await flush();

    expect(urls).toEqual(['http://localhost:4318/v1/traces']);
  });

  it('gives every span a new non-empty TraceId and SpanId, across flushes', async () => {
    const { bodies } = fetchSpy();
    const { telemetry, flush } = await loadTelemetry();
    const middleware = telemetry(identity);
    const ok = { response: new Response(null, { status: 200 }), attempts: 1, durationMs: 10 };
    await settle(middleware, 'getOrder', ok);
    await settle(middleware, 'listOrders', ok);
    await flush();
    await settle(middleware, 'getOrder', ok);
    await flush();

    const spans: OtlpSpan[] = [];
    for (const body of bodies) spans.push(...body.resourceSpans[0].scopeSpans[0].spans);
    expect(spans).toHaveLength(3);
    const traceIds = new Set(spans.map((span) => span.traceId));
    const spanIds = new Set(spans.map((span) => span.spanId));
    expect(traceIds.size).toBe(3);
    expect(spanIds.size).toBe(3);
    for (const span of spans) {
      expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
      expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
    }
  });
});
