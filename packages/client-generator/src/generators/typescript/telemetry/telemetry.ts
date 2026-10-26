import type { Middleware, SettledCall } from '../../../runtime-contract.js';

const GENERATOR_VERSION: string = 'dev';
const DEFAULT_ENDPOINT = 'https://otel.cloud.redocly.com/v1/traces';
const EVENT_TYPE = 'com.redocly.sdkUsage.aggregated';
const SEND_TIMEOUT_MS = 3000;
const SERVICE_NAME = 'redocly-sdk';

type StatusClass = '2xx' | '3xx' | '4xx' | '5xx' | 'network_error' | 'timeout' | 'aborted';
type LatencyBucket = 'lt_100ms' | 'lt_300ms' | 'lt_1s' | 'lt_3s' | 'lt_10s' | 'gte_10s';

const STATUS_CLASSES: StatusClass[] = [
  '2xx',
  '3xx',
  '4xx',
  '5xx',
  'network_error',
  'timeout',
  'aborted',
];
const LATENCY_BUCKETS: Array<{ bucket: LatencyBucket; belowMs: number }> = [
  { bucket: 'lt_100ms', belowMs: 100 },
  { bucket: 'lt_300ms', belowMs: 300 },
  { bucket: 'lt_1s', belowMs: 1000 },
  { bucket: 'lt_3s', belowMs: 3000 },
  { bucket: 'lt_10s', belowMs: 10000 },
  { bucket: 'gte_10s', belowMs: Infinity },
];

export type SdkUsageEvent = {
  id: string;
  type: typeof EVENT_TYPE;
  source: string;
  time: string;
  data: {
    usage: Record<string, string | number>;
    sdk: Record<string, string>;
  };
};

export type TelemetryOptions = {
  sdkName: string;
  sdkVersion: string;
  client: string;
  sink?: (events: SdkUsageEvent[]) => void | Promise<void>;
  endpoint?: string;
  flushIntervalMs?: number;
};

type OperationCounts = {
  calls: number;
  attempts: number;
  durationSumMs: number;
  status: Record<StatusClass, number>;
  latency: Record<LatencyBucket, number>;
};

type ProcessLike = {
  env?: Record<string, string | undefined>;
  versions?: { node?: string; bun?: string; deno?: string };
  on?: (event: 'beforeExit', listener: () => void) => void;
};

type OnFailedSend = 'keep' | 'drop';

const activeWindows = new Set<(onFailedSend: OnFailedSend) => Promise<void>>();
const pendingSends = new Set<Promise<void>>();
let exitHookInstalled = false;

function nodeProcess(): ProcessLike | undefined {
  return (globalThis as { process?: ProcessLike }).process;
}

function telemetryDisabled(): boolean {
  const runtimeProcess = nodeProcess();
  if (runtimeProcess === undefined) return true;
  // A browser bundle can add a `process` shim, so also check for `document`.
  if (typeof document !== 'undefined') return true;
  const env = runtimeProcess.env ?? {};
  if (env.REDOCLY_SDK_TELEMETRY === 'off') return true;
  if (env.DO_NOT_TRACK === '1') return true;
  return false;
}

export function flush(): Promise<void> {
  return flushWindows('keep');
}

async function flushWindows(onFailedSend: OnFailedSend): Promise<void> {
  for (const flushWindow of activeWindows) void flushWindow(onFailedSend);
  await Promise.all(pendingSends);
}

export function telemetry(options: TelemetryOptions): Middleware {
  if (telemetryDisabled()) return {};
  const intervalMs = options.flushIntervalMs ?? 60_000;
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const sink = options.sink ?? ((events: SdkUsageEvent[]) => sendOtlp(endpoint, events));
  const versions = nodeProcess()?.versions ?? {};
  let runtime = 'node';
  let runtimeVersion = versions.node ?? '';
  if (versions.bun !== undefined) {
    runtime = 'bun';
    runtimeVersion = versions.bun;
  } else if (versions.deno !== undefined) {
    runtime = 'deno';
    runtimeVersion = versions.deno;
  }
  const sdk: Record<string, string> = {
    name: options.sdkName,
    version: options.sdkVersion,
    generator_version: GENERATOR_VERSION,
    language: 'typescript',
    runtime,
    runtime_version: runtimeVersion,
    client: options.client,
  };
  let counts = new Map<string, OperationCounts>();
  let windowStart = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function openWindow(): void {
    windowStart = Date.now();
    timer = setTimeout(() => void flushWindow('keep'), intervalMs);
    unrefTimer(timer);
    activeWindows.add(flushWindow);
  }

  async function flushWindow(onFailedSend: OnFailedSend): Promise<void> {
    if (counts.size === 0) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    activeWindows.delete(flushWindow);
    const events = toEvents(counts, windowStart, Date.now() - windowStart, options.sdkName, sdk);
    const sentCounts = counts;
    const sentWindowStart = windowStart;
    counts = new Map();
    if (telemetryDisabled()) return;
    let failedSend: OnFailedSend | undefined;
    const send = Promise.resolve()
      .then(() => sink(events))
      .catch((error: unknown) => {
        failedSend = actionForFailedSend(error);
      });
    pendingSends.add(send);
    await send;
    pendingSends.delete(send);
    if (failedSend !== 'keep' || onFailedSend === 'drop') return;

    if (counts.size === 0) openWindow();
    if (sentWindowStart < windowStart) windowStart = sentWindowStart;
    for (const [operationId, sentOperation] of sentCounts) {
      const operation = counts.get(operationId);
      if (operation === undefined) {
        counts.set(operationId, sentOperation);
      } else {
        addCounts(operation, sentOperation);
      }
    }
  }

  installExitHook();

  return {
    onSettled: (ctx, call) => {
      if (counts.size === 0) openWindow();
      let operation = counts.get(ctx.operation.id);
      if (operation === undefined) {
        operation = emptyCounts();
        counts.set(ctx.operation.id, operation);
      }
      record(operation, call);
    },
  };
}

function installExitHook(): void {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  // Node emits `beforeExit` again after each send at exit.
  // Kept counts then cause one more send each time, so a failed send here drops its counts.
  nodeProcess()?.on?.('beforeExit', () => void flushWindows('drop'));
}

function unrefTimer(timer: unknown): void {
  if (timer instanceof Object && 'unref' in timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

function emptyCounts(): OperationCounts {
  return {
    calls: 0,
    attempts: 0,
    durationSumMs: 0,
    status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, network_error: 0, timeout: 0, aborted: 0 },
    latency: { lt_100ms: 0, lt_300ms: 0, lt_1s: 0, lt_3s: 0, lt_10s: 0, gte_10s: 0 },
  };
}

function record(operation: OperationCounts, call: SettledCall): void {
  operation.calls += 1;
  operation.attempts += call.attempts;
  operation.durationSumMs += call.durationMs;
  operation.status[statusClass(call)] += 1;
  for (const { bucket, belowMs } of LATENCY_BUCKETS) {
    if (call.durationMs < belowMs) {
      operation.latency[bucket] += 1;
      break;
    }
  }
}

function addCounts(target: OperationCounts, source: OperationCounts): void {
  target.calls += source.calls;
  target.attempts += source.attempts;
  target.durationSumMs += source.durationSumMs;
  for (const statusClass of STATUS_CLASSES) {
    target.status[statusClass] += source.status[statusClass];
  }
  for (const { bucket } of LATENCY_BUCKETS) {
    target.latency[bucket] += source.latency[bucket];
  }
}

function statusClass(call: SettledCall): StatusClass {
  if (call.response === undefined) {
    if (call.error instanceof Error && call.error.name === 'TimeoutError') return 'timeout';
    if (call.error instanceof Error && call.error.name === 'AbortError') return 'aborted';
    return 'network_error';
  }
  const status = call.response.status;
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  if (status >= 300) return '3xx';
  return '2xx';
}

function toEvents(
  counts: Map<string, OperationCounts>,
  windowStart: number,
  windowMs: number,
  source: string,
  sdk: Record<string, string>
): SdkUsageEvent[] {
  const events: SdkUsageEvent[] = [];
  for (const [operationId, operation] of counts) {
    const usage: Record<string, string | number> = {
      operation_id: operationId,
      window_ms: windowMs,
      calls: operation.calls,
      attempts: operation.attempts,
      duration_sum_ms: operation.durationSumMs,
    };
    for (const statusClass of STATUS_CLASSES) {
      const count = operation.status[statusClass];
      if (count > 0) {
        usage[`status_${statusClass}`] = count;
      }
    }
    for (const { bucket } of LATENCY_BUCKETS) {
      const count = operation.latency[bucket];
      if (count > 0) {
        usage[`latency_${bucket}`] = count;
      }
    }
    events.push({
      id: `evt_${randomHex(16)}`,
      type: EVENT_TYPE,
      source,
      time: new Date(windowStart).toISOString(),
      data: { usage, sdk },
    });
  }
  return events;
}

async function sendOtlp(endpoint: string, events: SdkUsageEvent[]): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    // One send per window, so the socket is never reused: close it instead of keeping it idle.
    headers: { 'Content-Type': 'application/json', Connection: 'close' },
    body: JSON.stringify(toOtlpRequest(events)),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  await response.body?.cancel();
  if (!response.ok) {
    throw new RejectedSendError(response.status);
  }
}

class RejectedSendError extends Error {
  public readonly status: number;
  constructor(status: number) {
    super(`The telemetry endpoint answered ${status}.`);
    this.name = 'RejectedSendError';
    this.status = status;
  }
}

function actionForFailedSend(error: unknown): OnFailedSend {
  // The endpoint can have stored the counts of a send that timed out.
  if (error instanceof Error && error.name === 'TimeoutError') return 'drop';
  if (error instanceof RejectedSendError) {
    if (error.status === 408 || error.status === 429 || error.status >= 500) return 'keep';
    // The endpoint refuses the same counts again.
    return 'drop';
  }
  return 'keep';
}

type OtlpValue = { stringValue: string } | { intValue: number } | { doubleValue: number };
type OtlpAttribute = { key: string; value: OtlpValue };

function toOtlpRequest(events: SdkUsageEvent[]) {
  const spans = [];
  for (const event of events) {
    const timeUnixNano = `${Date.parse(event.time)}000000`;
    const attributes: OtlpAttribute[] = [
      attribute('cloudevents.event_id', event.id),
      attribute('cloudevents.event_type', event.type),
      attribute('cloudevents.event_source', event.source),
      attribute('cloudevents.event_spec_version', '1.0'),
      attribute('cloudevents.event_data_content_type', 'application/json; charset=utf-8'),
      attribute('cloudevents.event_time', event.time),
      attribute('cloudevents.event_subject', ''),
      attribute('cloudevents.event_origin', SERVICE_NAME),
      attribute('cloudevents.event_object', 'event'),
      attribute('cloudevents.event_category', 'product'),
      attribute('cloudevents.event_signal', 'metric'),
    ];
    for (const [key, value] of Object.entries(event.data.usage)) {
      attributes.push(attribute(`cloudevents.event_data.usage.${key}`, value));
    }
    for (const [key, value] of Object.entries(event.data.sdk)) {
      attributes.push(attribute(`cloudevents.event_data.sdk.${key}`, value));
    }
    spans.push({
      traceId: randomHex(16),
      spanId: randomHex(8),
      name: `event.${event.type}`,
      kind: 1,
      startTimeUnixNano: timeUnixNano,
      endTimeUnixNano: timeUnixNano,
      attributes,
    });
  }
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            attribute('service.name', SERVICE_NAME),
            attribute('service.version', GENERATOR_VERSION),
          ],
        },
        scopeSpans: [{ scope: { name: 'redocly-sdk-telemetry' }, spans }],
      },
    ],
  };
}

function attribute(key: string, value: string | number): OtlpAttribute {
  if (typeof value === 'string') return { key, value: { stringValue: value } };
  if (Number.isInteger(value)) return { key, value: { intValue: value } };
  return { key, value: { doubleValue: value } };
}

function randomHex(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}
