<?php

// @redocly/client-generator PHP runtime — embedded into generated clients.
// PHP >= 8.1, zero Composer dependencies; HTTP over the curl extension.
// The generated file re-declares the namespace; the embed strips this header.

declare(strict_types=1);

namespace RedoclyClientRuntime;

/** A response with status >= 400, decoded body attached. */
final class ApiError extends \RuntimeException
{
    public function __construct(
        public readonly string $url,
        public readonly int $status,
        public readonly string $reason,
        public readonly mixed $body,
    ) {
        parent::__construct("HTTP {$status} {$reason} for {$url}");
    }
}

/** Every attempt timed out or failed to connect. */
final class TimeoutError extends \RuntimeException
{
    public function __construct(
        public readonly string $url,
        public readonly ?float $timeout,
        public readonly int $attempts,
    ) {
        $seconds = $timeout === null ? 'the configured timeout' : "{$timeout}s";
        parent::__construct("Request to {$url} timed out after {$seconds} ({$attempts} attempt(s))");
    }
}

/** One parsed `text/event-stream` frame. */
final class ServerSentEvent
{
    public function __construct(
        public readonly string $event,
        public readonly mixed $data,
        public readonly ?string $id = null,
        public readonly ?int $retry = null,
    ) {
    }
}

/**
 * Per-instance configuration.
 * `auth`: `['bearer' => string|callable, 'basic' => ['username' => ..., 'password' => ...], 'apiKey' => [scheme => string|callable]]`.
 * `retry`: `['attempts' => int, 'delay' => float, 'strategy' => 'exponential'|'fixed', 'retryOn' => callable]`.
 * `middleware`: callables `fn(array $request, callable $next): array` around each attempt.
 */
final class Config
{
    public function __construct(
        public string $serverUrl = '',
        public array $auth = [],
        public ?float $timeout = null,
        public array $retry = [],
        public array $middleware = [],
        public string $clientHeader = 'redocly-client-generator',
    ) {
    }
}

/** Resolve a literal-or-callable credential to its string value. */
function resolveToken(mixed $provider): string
{
    return is_callable($provider) ? (string) $provider() : (string) $provider;
}

/**
 * Apply the first fully-configured security alternative. `$security` is an OR-list
 * of AND-sets of specs: `['kind' => 'bearer'|'basic'|'apiKey', 'scheme' => ..., 'name' => ?, 'in' => ?]`.
 * Returns `[headers, query, cookies]`.
 */
function resolveAuth(array $security, array $auth): array
{
    foreach ($security as $andSet) {
        $headers = [];
        $query = [];
        $cookies = [];
        $satisfied = true;
        foreach ($andSet as $spec) {
            if ($spec['kind'] === 'bearer' && isset($auth['bearer'])) {
                $headers['Authorization'] = 'Bearer ' . resolveToken($auth['bearer']);
            } elseif ($spec['kind'] === 'basic' && isset($auth['basic'])) {
                $headers['Authorization'] =
                    'Basic ' . base64_encode($auth['basic']['username'] . ':' . $auth['basic']['password']);
            } elseif ($spec['kind'] === 'apiKey' && isset($auth['apiKey'][$spec['scheme']])) {
                $value = resolveToken($auth['apiKey'][$spec['scheme']]);
                if ($spec['in'] === 'query') {
                    $query[$spec['name']] = $value;
                } elseif ($spec['in'] === 'cookie') {
                    $cookies[] = $spec['name'] . '=' . rawurlencode($value);
                } else {
                    $headers[$spec['name']] = $value;
                }
            } else {
                $satisfied = false;
                break;
            }
        }
        if ($satisfied) {
            return [$headers, $query, $cookies];
        }
    }
    return [[], [], []];
}

/** Substitute `{param}` templates with encoded values and prefix the server URL. */
function buildUrl(string $serverUrl, string $path, array $pathParams): string
{
    foreach ($pathParams as $name => $value) {
        $path = str_replace('{' . $name . '}', rawurlencode((string) $value), $path);
    }
    return rtrim($serverUrl, '/') . $path;
}

/** The default retry predicate: 5xx, 429, and transport timeouts/connect failures. */
function defaultRetryOn(array $context): bool
{
    if (($context['timedOut'] ?? false) === true) {
        return true;
    }
    $status = $context['status'] ?? 0;
    return $status >= 500 || $status === 429;
}

/** Delay before the next attempt: `Retry-After` wins; otherwise jittered (fixed|exponential) backoff. */
function retryDelay(int $attempt, array $retry, ?string $retryAfter): float
{
    if ($retryAfter !== null && ctype_digit($retryAfter)) {
        return (float) $retryAfter;
    }
    $base = (float) ($retry['delay'] ?? 1.0);
    $strategy = $retry['strategy'] ?? 'exponential';
    $delay = $strategy === 'fixed' ? $base : $base * (2 ** ($attempt - 1));
    return $delay * (0.5 + mt_rand() / mt_getrandmax() / 2);
}

/** Append query params in form style: list values repeat the key (`tag=a&tag=b`). */
function appendQuery(string $url, array $query): string
{
    $pairs = [];
    foreach ($query as $name => $value) {
        foreach (is_array($value) ? $value : [$value] as $single) {
            $encoded = is_bool($single) ? ($single ? 'true' : 'false') : (string) $single;
            $pairs[] = rawurlencode($name) . '=' . rawurlencode($encoded);
        }
    }
    if ($pairs === []) {
        return $url;
    }
    return $url . (str_contains($url, '?') ? '&' : '?') . implode('&', $pairs);
}

/** One raw curl exchange. Returns `['status', 'reason', 'headers', 'body', 'url', 'timedOut']`. */
function rawSend(Config $config, array $request): array
{
    $url = appendQuery($request['url'], $request['query'] ?? []);
    $handle = curl_init($url);
    $headerLines = [];
    foreach ($request['headers'] ?? [] as $name => $value) {
        $headerLines[] = $name . ': ' . $value;
    }
    $responseHeaders = [];
    curl_setopt_array($handle, [
        CURLOPT_CUSTOMREQUEST => $request['method'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headerLines,
        CURLOPT_HEADERFUNCTION => function ($ch, string $line) use (&$responseHeaders): int {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) {
                $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
            return strlen($line);
        },
    ]);
    if (($request['body'] ?? null) !== null) {
        curl_setopt($handle, CURLOPT_POSTFIELDS, $request['body']);
    }
    if ($config->timeout !== null) {
        curl_setopt($handle, CURLOPT_TIMEOUT_MS, (int) round($config->timeout * 1000));
    }
    $body = curl_exec($handle);
    $errno = curl_errno($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    $effectiveUrl = (string) curl_getinfo($handle, CURLINFO_EFFECTIVE_URL);
    if ($errno !== 0) {
        $timedOut = $errno === CURLE_OPERATION_TIMEDOUT || $errno === CURLE_COULDNT_CONNECT;
        return [
            'status' => 0,
            'reason' => curl_strerror($errno) ?? 'transport error',
            'headers' => [],
            'body' => '',
            'url' => $effectiveUrl,
            'timedOut' => $timedOut,
        ];
    }
    return [
        'status' => $status,
        'reason' => '',
        'headers' => $responseHeaders,
        'body' => is_string($body) ? $body : '',
        'url' => $effectiveUrl,
        'timedOut' => false,
    ];
}

/**
 * Send with retries and middleware. `$request` carries `operationId`, `method`, `url`,
 * `headers`, `query`, and optional `body`/`contentType`/`idempotencyKey`.
 * Returns the raw response array; callers map status >= 400 to `ApiError`.
 */
function send(Config $config, array $request): array
{
    $headers = $request['headers'] ?? [];
    $headers['X-Redocly-Client'] = $config->clientHeader;
    if (($request['contentType'] ?? null) !== null) {
        $headers['Content-Type'] = $request['contentType'];
    }
    if (($request['idempotencyKey'] ?? null) !== null) {
        $headers['Idempotency-Key'] = $request['idempotencyKey'];
    }
    $request['headers'] = $headers;

    $handler = fn (array $req): array => rawSend($config, $req);
    foreach (array_reverse($config->middleware) as $middleware) {
        $next = $handler;
        $handler = fn (array $req): array => $middleware($req, $next);
    }

    $attempts = max(1, (int) ($config->retry['attempts'] ?? 3));
    $retryOn = $config->retry['retryOn'] ?? __NAMESPACE__ . '\\defaultRetryOn';
    $response = null;
    for ($attempt = 1; $attempt <= $attempts; $attempt++) {
        $response = $handler($request);
        $context = [
            'status' => $response['status'],
            'timedOut' => $response['timedOut'],
            'attempt' => $attempt,
            'operationId' => $request['operationId'] ?? '',
        ];
        if ($attempt === $attempts || !$retryOn($context)) {
            break;
        }
        $seconds = retryDelay($attempt, $config->retry, $response['headers']['retry-after'] ?? null);
        usleep((int) round($seconds * 1_000_000));
    }
    if ($response['timedOut']) {
        throw new TimeoutError($response['url'], $config->timeout, $attempts);
    }
    if ($response['status'] === 0) {
        throw new \RuntimeException("Request to {$response['url']} failed: {$response['reason']}");
    }
    return $response;
}

/** Decoded JSON body (assoc arrays), or null for empty bodies. */
function decodeJson(array $response): mixed
{
    if ($response['body'] === '') {
        return null;
    }
    return json_decode($response['body'], true);
}

/** `ApiError` from a non-2xx response. */
function apiErrorFrom(array $response): ApiError
{
    return new ApiError($response['url'], $response['status'], $response['reason'], decodeJson($response));
}

/** Walk an RFC 6901 JSON pointer over decoded JSON; null on any miss. */
function resolvePointer(mixed $data, string $pointer): mixed
{
    if ($pointer === '') {
        return $data;
    }
    foreach (explode('/', substr($pointer, 1)) as $token) {
        $key = str_replace(['~1', '~0'], ['/', '~'], $token);
        if (!is_array($data) || !array_key_exists($key, $data)) {
            return null;
        }
        $data = $data[$key];
    }
    return $data;
}

/** The `rel="next"` target of a `Link` header, or null. */
function linkNext(?string $header): ?string
{
    if ($header === null) {
        return null;
    }
    foreach (explode(',', $header) as $part) {
        if (preg_match('/<([^>]+)>\s*;[^,]*rel="?next"?/', trim($part), $match) === 1) {
            return $match[1];
        }
    }
    return null;
}

/**
 * Auto-pagination: `$call(array $params): [mixed rawPage, array $response]`, `$spec` is the
 * normalized rule (`style`, `param`, `nextCursor`, `hasMore`, `items`), `$base` the caller's
 * query params. Yields raw decoded pages; generated wrappers hydrate them into models.
 */
function iterPages(callable $call, array $spec, array $base): \Generator
{
    $params = $base;
    $style = $spec['style'];
    $seenCursors = [];
    $seenLinks = [];
    $offset = null;
    $page = null;
    while (true) {
        [$raw, $response] = $call($params);
        yield $raw;
        if ($style === 'cursor') {
            $next = resolvePointer($raw, $spec['nextCursor'] ?? '');
            if (isset($spec['hasMore']) && resolvePointer($raw, $spec['hasMore']) !== true) {
                return;
            }
            if (!is_string($next) || $next === '' || isset($seenCursors[$next])) {
                return;
            }
            $seenCursors[$next] = true;
            $params[$spec['param']] = $next;
        } elseif ($style === 'link') {
            $target = linkNext($response['headers']['link'] ?? null);
            if ($target === null || isset($seenLinks[$target])) {
                return;
            }
            $seenLinks[$target] = true;
            $parsed = parse_url($target);
            $linkParams = [];
            parse_str($parsed['query'] ?? '', $linkParams);
            $params = array_merge($params, $linkParams);
        } else {
            $items = resolvePointer($raw, $spec['items'] ?? '');
            $count = is_array($items) ? count($items) : 0;
            if ($count === 0) {
                return;
            }
            if ($style === 'offset') {
                $offset = ($offset ?? (int) ($base[$spec['param']] ?? 0)) + $count;
                $params[$spec['param']] = $offset;
            } else {
                $page = ($page ?? (int) ($base[$spec['param']] ?? 1)) + 1;
                $params[$spec['param']] = $page;
            }
        }
    }
}

/** Parse one SSE frame; returns `[?ServerSentEvent, ?string lastEventId, ?int retryMs]`. */
function parseSseFrame(string $frame, bool $jsonData): array
{
    $event = 'message';
    $dataLines = [];
    $id = null;
    $retry = null;
    foreach (explode("\n", str_replace("\r\n", "\n", $frame)) as $line) {
        if ($line === '' || str_starts_with($line, ':')) {
            continue;
        }
        $colon = strpos($line, ':');
        $field = $colon === false ? $line : substr($line, 0, $colon);
        $value = $colon === false ? '' : ltrim(substr($line, $colon + 1), ' ');
        if ($field === 'event') {
            $event = $value;
        } elseif ($field === 'data') {
            $dataLines[] = $value;
        } elseif ($field === 'id') {
            $id = $value;
        } elseif ($field === 'retry' && ctype_digit($value)) {
            $retry = (int) $value;
        }
    }
    if ($dataLines === [] && $id === null && $retry === null) {
        return [null, null, $retry];
    }
    $data = implode("\n", $dataLines);
    $decoded = $jsonData && $data !== '' ? json_decode($data, true) : $data;
    return [new ServerSentEvent($event, $decoded, $id, $retry), $id, $retry];
}

/**
 * Stream server-sent events. `$open(array $extraHeaders): \CurlHandle` returns a configured
 * (not yet executed) handle; this pump drives it with curl_multi, yields parsed frames, and
 * reconnects with `Last-Event-ID` on transient failures (4xx is definitive; backoff <= 30s).
 */
function iterSse(callable $open, bool $jsonData): \Generator
{
    $lastEventId = null;
    $retryMs = 3000;
    while (true) {
        $extra = ['Accept' => 'text/event-stream'];
        if ($lastEventId !== null) {
            $extra['Last-Event-ID'] = $lastEventId;
        }
        $handle = $open($extra);
        $buffer = '';
        curl_setopt($handle, CURLOPT_WRITEFUNCTION, function ($ch, string $chunk) use (&$buffer): int {
            $buffer .= $chunk;
            return strlen($chunk);
        });
        $multi = curl_multi_init();
        curl_multi_add_handle($multi, $handle);
        do {
            curl_multi_exec($multi, $running);
            if ($running > 0) {
                curl_multi_select($multi, 0.1);
            }
            while (($split = strpos($buffer, "\n\n")) !== false || ($split = strpos($buffer, "\r\n\r\n")) !== false) {
                $frameLength = $buffer[$split] === "\r" ? 4 : 2;
                $frame = substr($buffer, 0, $split);
                $buffer = substr($buffer, $split + $frameLength);
                [$event, $id, $retry] = parseSseFrame($frame, $jsonData);
                if ($id !== null) {
                    $lastEventId = $id;
                }
                if ($retry !== null) {
                    $retryMs = min($retry, 30000);
                }
                if ($event !== null) {
                    yield $event;
                }
            }
        } while ($running > 0);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $url = (string) curl_getinfo($handle, CURLINFO_EFFECTIVE_URL);
        curl_multi_remove_handle($multi, $handle);
        curl_multi_close($multi);
        if ($status >= 400 && $status < 500) {
            throw new ApiError($url, $status, '', $buffer);
        }
        // A clean 200 end-of-stream is done; anything else reconnects with Last-Event-ID.
        if ($status === 200) {
            return;
        }
        usleep($retryMs * 1000);
    }
}

/** Encode an assoc body as `multipart/form-data`; nested values are JSON parts. Returns `[contentType, body]`. */
function toMultipart(array $body): array
{
    $boundary = 'redocly-' . bin2hex(random_bytes(12));
    $parts = '';
    foreach ($body as $name => $value) {
        $parts .= "--{$boundary}\r\n";
        if (is_array($value)) {
            $parts .= "Content-Disposition: form-data; name=\"{$name}\"\r\n";
            $parts .= "Content-Type: application/json\r\n\r\n";
            $parts .= json_encode($value) . "\r\n";
        } else {
            $parts .= "Content-Disposition: form-data; name=\"{$name}\"\r\n\r\n";
            $parts .= (is_bool($value) ? ($value ? 'true' : 'false') : (string) $value) . "\r\n";
        }
    }
    $parts .= "--{$boundary}--\r\n";
    return ['multipart/form-data; boundary=' . $boundary, $parts];
}
