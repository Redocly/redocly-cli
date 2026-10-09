<?php

// Runtime smoke for stream request bodies in the generated PHP SDK. Run by
// stream-bodies.test.ts with the echo server's base URL as the only argument. It
// only makes the calls, in a fixed order; the test reads what the server received.

declare(strict_types=1);

use StreamBodies\{ApiError, Client, Config};

require __DIR__ . '/client/client.php';

// A stream wrapper without stream_stat: fstat() returns false on it, like on
// php://input, so the client has no length to send and must upload it chunked.
final class NoStat
{
    public static string $payload = '';
    /** PHP assigns the stream context here when the wrapper is opened. */
    public mixed $context;
    private int $position = 0;

    public function stream_open(string $path, string $mode, int $options, ?string &$openedPath): bool
    {
        return true;
    }

    public function stream_read(int $count): string
    {
        $chunk = substr(self::$payload, $this->position, $count);
        $this->position += strlen($chunk);
        return $chunk;
    }

    public function stream_eof(): bool
    {
        return $this->position >= strlen(self::$payload);
    }
}

function memoryStream(string $payload)
{
    $stream = fopen('php://memory', 'r+');
    fwrite($stream, $payload);
    rewind($stream);
    return $stream;
}

function expectUnavailable(callable $call): void
{
    try {
        $call();
    } catch (ApiError $error) {
        if ($error->status === 503) {
            return;
        }
        throw $error;
    }
    fwrite(STDERR, "expected a 503 ApiError\n");
    exit(1);
}

$multipart = "--redocly\r\nContent-Disposition: form-data; name=\"note\"\r\n\r\nhello stream\r\n--redocly--\r\n";
$binary = implode('', array_map('chr', range(0, 255)));
$client = new Client(new Config(serverUrl: $argv[1], retry: ['attempts' => 3, 'delay' => 0]));

// Streams: the body passes through untouched and is sent once, even under /fail/.
$client->upload(memoryStream($multipart));
$client->uploadBlob('declared', memoryStream($binary));
expectUnavailable(fn () => $client->uploadFailing('stream', memoryStream($binary)));

// Replayable bodies: the caller's Content-Type wins, and the retry policy still applies.
$client->uploadBlob('custom', $binary, ['content-type' => 'application/x-custom']);
expectUnavailable(fn () => $client->uploadFailing('bytes', $binary));

// A stream with no fstat() still arrives whole.
stream_wrapper_register('nostat', NoStat::class);
NoStat::$payload = $binary;
$client->uploadBlob('nostat', fopen('nostat://binary', 'rb'));

echo "PHP_SMOKE_OK\n";
