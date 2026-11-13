<?php

// Runtime smoke for the generated PHP SDK, exercised against the same Node mock
// server the other consumers use. Run by php/client.test.ts with the server base URL
// as the only argument.

declare(strict_types=1);

use BaseConsumer\{ApiError, Client, Config, Pet, TimeoutError};

// Like a Composer classmap autoloader: the file is loaded only when its classes are
// not already there, which they are when php/client.test.ts preloads it through OPcache.
// With `preloaded` as the second argument, that must already have happened.
$preloaded = class_exists(Client::class, false);
if (($argv[2] ?? null) === 'preloaded' && !$preloaded) {
    fwrite(STDERR, "expected OPcache to have preloaded the client\n");
    exit(1);
}
if (!$preloaded) {
    require __DIR__ . '/client/client.php';
}

$base = $argv[1];
$client = new Client(new Config(serverUrl: $base));

// Typed call: the response hydrates into the generated class.
$pet = $client->getPetById(1);
if (!($pet instanceof Pet) || $pet->name === '') {
    fwrite(STDERR, "pet should hydrate into the Pet class\n");
    exit(1);
}

// Collection + request body round-trips.
$client->listPets();
$client->createPet(new Pet(name: 'Smokey'));

// A non-2xx throws the structured ApiError (a wrong base path 404s every route).
$broken = new Client(new Config(serverUrl: $base . '/nowhere'));
try {
    $broken->getPetById(1);
    fwrite(STDERR, "expected an ApiError\n");
    exit(1);
} catch (ApiError $error) {
    if ($error->status !== 404) {
        fwrite(STDERR, "expected 404, got {$error->status}\n");
        exit(1);
    }
}

// A refused connection is a transport error, not a timeout, and it is retried (port 1 has no listener).
$settled = [];
$refused = new Client(new Config(
    serverUrl: 'http://127.0.0.1:1',
    retry: ['attempts' => 2, 'delay' => 0.01],
    onSettled: [function (array $call) use (&$settled): void {
        $settled[] = $call;
    }],
));
try {
    $refused->listPets();
    fwrite(STDERR, "expected a transport error\n");
    exit(1);
} catch (\RuntimeException $error) {
    if ($error instanceof TimeoutError || $settled[0]['timedOut'] || $settled[0]['attempts'] !== 2) {
        fwrite(STDERR, "a refused connection should fail after 2 attempts, and not as a timeout\n");
        exit(1);
    }
}

// The default retry skips a POST without an Idempotency-Key, as in the other languages.
try {
    $refused->createPet(new Pet(name: 'Smokey'));
    fwrite(STDERR, "expected a transport error\n");
    exit(1);
} catch (\RuntimeException $error) {
    if ($settled[1]['attempts'] !== 1) {
        fwrite(STDERR, "a POST should not retry, got {$settled[1]['attempts']} attempts\n");
        exit(1);
    }
}

echo "PHP_SMOKE_OK\n";
