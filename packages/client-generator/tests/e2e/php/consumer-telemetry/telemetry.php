<?php

// Usage telemetry consumer for the generated PHP SDK. Run by php/telemetry.test.ts with
// the API base URL, the telemetry sink URL, and an optional `registered`, which registers
// the telemetry for every client instead of passing it.

declare(strict_types=1);

use BaseConsumer\{Client, Config, UsageTelemetry};

require __DIR__ . '/client/client.php';
require __DIR__ . '/client/client.telemetry.php';

$telemetry = new UsageTelemetry(
    sdkName: '@acme/pets-sdk',
    sdkVersion: '1.0.0',
    client: 'pets-worker/2.0.0',
    endpoint: $argv[2],
);
$registered = ($argv[3] ?? '') === 'registered';
if ($registered) {
    $telemetry->register();
}
$api = new Client(new Config(
    serverUrl: $argv[1],
    retry: ['attempts' => 2, 'delay' => 0.001],
    onSettled: $registered ? [] : [$telemetry],
));
$api->listPets();
$api->listPets();
// A failed send keeps its counts, and the shutdown flush sends them.
if ($registered) {
    UsageTelemetry::flushRegistered();
} else {
    $telemetry->flush();
}
