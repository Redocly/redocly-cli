<?php

// Usage telemetry for a generated PHP SDK, written beside the client by
// `client.telemetry: on`. It counts calls per operation through the runtime's
// `onSettled` hook and sends one event per operation and window. An event holds
// only the operation id, the counts, the window, and the SDK identity.

declare(strict_types=1);

namespace RedoclyClientRuntime;

/**
 * Register with `new Config(onSettled: [new UsageTelemetry(...)])`. PHP has no timers:
 * a call that finds its window elapsed sends that window first, in the calling request,
 * and a shutdown function sends the open window. `sink`, when set, receives the events
 * instead of a send; an exception it throws keeps the counts.
 */
final class UsageTelemetry
{
    private const GENERATOR_VERSION = 'dev';
    private const DEFAULT_ENDPOINT = 'https://otel.cloud.redocly.com/v1/traces';
    private const EVENT_TYPE = 'com.redocly.sdkUsage.aggregated';
    private const SEND_TIMEOUT_MS = 3000;
    private const SERVICE_NAME = 'redocly-sdk';
    private const STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx', 'network_error', 'timeout', 'aborted'];
    private const LATENCY_BUCKETS = [
        'lt_100ms' => 100,
        'lt_300ms' => 300,
        'lt_1s' => 1000,
        'lt_3s' => 3000,
        'lt_10s' => 10000,
        'gte_10s' => PHP_INT_MAX,
    ];

    private bool $enabled;
    private array $sdk;
    private string $endpoint;
    private ?\Closure $sink;
    private array $counts = [];
    private float $windowStart = 0.0;

    public function __construct(
        string $sdkName,
        string $sdkVersion,
        string $client,
        ?callable $sink = null,
        ?string $endpoint = null,
        private int $flushIntervalMs = 60_000,
    ) {
        $this->enabled = !self::disabled();
        $this->sdk = [
            'name' => $sdkName,
            'version' => $sdkVersion,
            'generator_version' => self::GENERATOR_VERSION,
            'language' => 'php',
            'runtime' => 'php',
            'runtime_version' => PHP_VERSION,
            'client' => $client,
        ];
        $this->endpoint = $endpoint ?? self::DEFAULT_ENDPOINT;
        $this->sink = $sink === null ? null : \Closure::fromCallable($sink);
        if ($this->enabled) {
            // There is no later window at shutdown, so a failed send drops its counts.
            register_shutdown_function(fn () => $this->flushWindow(false));
        }
    }

    public function __invoke(array $call): void
    {
        if (!$this->enabled) {
            return;
        }
        $now = microtime(true);
        if ($this->counts !== [] && ($now - $this->windowStart) * 1000 >= $this->flushIntervalMs) {
            $this->flushWindow(true);
        }
        if ($this->counts === []) {
            $this->windowStart = $now;
        }
        $operationId = $call['operationId'];
        $operation = $this->counts[$operationId] ?? self::emptyCounts();
        $operation['calls'] += 1;
        $operation['attempts'] += $call['attempts'];
        $operation['durationSumMs'] += $call['durationMs'];
        $status = self::statusClass($call);
        $operation['status'][$status] = ($operation['status'][$status] ?? 0) + 1;
        foreach (self::LATENCY_BUCKETS as $bucket => $belowMs) {
            if ($call['durationMs'] < $belowMs) {
                $operation['latency'][$bucket] = ($operation['latency'][$bucket] ?? 0) + 1;
                break;
            }
        }
        $this->counts[$operationId] = $operation;
    }

    /** Send the open window now, for example before `exit` in a long-running worker. */
    public function flush(): void
    {
        $this->flushWindow(true);
    }

    private static function disabled(): bool
    {
        return getenv('REDOCLY_SDK_TELEMETRY') === 'off' || getenv('DO_NOT_TRACK') === '1';
    }

    private static function emptyCounts(): array
    {
        return ['calls' => 0, 'attempts' => 0, 'durationSumMs' => 0, 'status' => [], 'latency' => []];
    }

    private static function statusClass(array $call): string
    {
        if ($call['timedOut']) {
            return 'timeout';
        }
        $status = $call['status'];
        if ($status === 0) {
            return 'network_error';
        }
        if ($status >= 500) {
            return '5xx';
        }
        if ($status >= 400) {
            return '4xx';
        }
        if ($status >= 300) {
            return '3xx';
        }
        return '2xx';
    }

    private function flushWindow(bool $keepOnFailure): void
    {
        if ($this->counts === []) {
            return;
        }
        $sentCounts = $this->counts;
        $sentStart = $this->windowStart;
        $this->counts = [];
        if (self::disabled()) {
            return;
        }
        $events = $this->toEvents($sentCounts, $sentStart, microtime(true) - $sentStart);
        if ($this->deliver($events) !== 'keep' || !$keepOnFailure) {
            return;
        }
        // PHP is single-threaded, so no call was recorded during the send.
        $this->counts = $sentCounts;
        $this->windowStart = $sentStart;
    }

    /** `sent`, or what to do with the counts after a failed send: `keep` or `drop`. */
    private function deliver(array $events): string
    {
        if ($this->sink !== null) {
            try {
                ($this->sink)($events);
                return 'sent';
            } catch (\Throwable) {
                return 'keep';
            }
        }
        $handle = curl_init($this->endpoint);
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(self::toOtlpRequest($events)),
            // One send per window, so the connection is never reused.
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Connection: close'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT_MS => self::SEND_TIMEOUT_MS,
        ]);
        if (curl_exec($handle) === false) {
            // The endpoint can have stored the counts of a send that timed out.
            return curl_errno($handle) === CURLE_OPERATION_TIMEDOUT ? 'drop' : 'keep';
        }
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        if ($status >= 200 && $status < 300) {
            return 'sent';
        }
        return $status === 408 || $status === 429 || $status >= 500 ? 'keep' : 'drop';
    }

    private function toEvents(array $counts, float $windowStart, float $windowSeconds): array
    {
        $milliseconds = (int) (($windowStart - floor($windowStart)) * 1000);
        $time = gmdate('Y-m-d\TH:i:s', (int) $windowStart) . sprintf('.%03dZ', $milliseconds);
        $events = [];
        foreach ($counts as $operationId => $operation) {
            $usage = [
                'operation_id' => (string) $operationId,
                'window_ms' => (int) ($windowSeconds * 1000),
                'calls' => $operation['calls'],
                'attempts' => $operation['attempts'],
                'duration_sum_ms' => $operation['durationSumMs'],
            ];
            foreach (self::STATUS_CLASSES as $status) {
                if (isset($operation['status'][$status])) {
                    $usage["status_{$status}"] = $operation['status'][$status];
                }
            }
            foreach (array_keys(self::LATENCY_BUCKETS) as $bucket) {
                if (isset($operation['latency'][$bucket])) {
                    $usage["latency_{$bucket}"] = $operation['latency'][$bucket];
                }
            }
            $events[] = [
                'id' => 'evt_' . bin2hex(random_bytes(16)),
                'type' => self::EVENT_TYPE,
                'source' => $this->sdk['name'],
                'time' => $time,
                'data' => ['usage' => $usage, 'sdk' => $this->sdk],
            ];
        }
        return $events;
    }

    private static function toOtlpRequest(array $events): array
    {
        $spans = [];
        foreach ($events as $event) {
            $started = \DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s.v\Z', $event['time'], new \DateTimeZone('UTC'));
            $timeUnixNano = $started->format('Uv') . '000000';
            $attributes = [
                self::attribute('cloudevents.event_id', $event['id']),
                self::attribute('cloudevents.event_type', $event['type']),
                self::attribute('cloudevents.event_source', $event['source']),
                self::attribute('cloudevents.event_spec_version', '1.0'),
                self::attribute('cloudevents.event_data_content_type', 'application/json; charset=utf-8'),
                self::attribute('cloudevents.event_time', $event['time']),
                self::attribute('cloudevents.event_subject', ''),
                self::attribute('cloudevents.event_origin', self::SERVICE_NAME),
                self::attribute('cloudevents.event_object', 'event'),
                self::attribute('cloudevents.event_category', 'product'),
                self::attribute('cloudevents.event_signal', 'metric'),
            ];
            foreach ($event['data']['usage'] as $key => $value) {
                $attributes[] = self::attribute("cloudevents.event_data.usage.{$key}", $value);
            }
            foreach ($event['data']['sdk'] as $key => $value) {
                $attributes[] = self::attribute("cloudevents.event_data.sdk.{$key}", $value);
            }
            $spans[] = [
                'traceId' => bin2hex(random_bytes(16)),
                'spanId' => bin2hex(random_bytes(8)),
                'name' => 'event.' . $event['type'],
                'kind' => 1,
                'startTimeUnixNano' => $timeUnixNano,
                'endTimeUnixNano' => $timeUnixNano,
                'attributes' => $attributes,
            ];
        }
        return [
            'resourceSpans' => [
                [
                    'resource' => [
                        'attributes' => [
                            self::attribute('service.name', self::SERVICE_NAME),
                            self::attribute('service.version', self::GENERATOR_VERSION),
                        ],
                    ],
                    'scopeSpans' => [['scope' => ['name' => 'redocly-sdk-telemetry'], 'spans' => $spans]],
                ],
            ],
        ];
    }

    private static function attribute(string $key, string|int|float $value): array
    {
        if (is_string($value)) {
            return ['key' => $key, 'value' => ['stringValue' => $value]];
        }
        if (is_int($value)) {
            return ['key' => $key, 'value' => ['intValue' => $value]];
        }
        return ['key' => $key, 'value' => ['doubleValue' => $value]];
    }
}
