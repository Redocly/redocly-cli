<?php

// Runtime smoke for the generated PHP SDK, exercised against the same Node mock
// server the other consumers use. Run by php.test.ts with the server base URL
// as the only argument.

declare(strict_types=1);

require __DIR__ . '/client/client.php';

use BaseConsumer\{ApiError, Client, Config, Pet};

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

echo "PHP_SMOKE_OK\n";
