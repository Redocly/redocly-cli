<?php

// Runtime check for write-only properties in the generated PHP SDK. Run by
// php/write-only.test.ts with the server base URL as the only argument. The request sends
// the password; the response comes back without it and must still hydrate.

declare(strict_types=1);

use CafeCustomers\{Client, Config, Customer};

require __DIR__ . '/client/client.php';

$client = new Client(new Config(serverUrl: $argv[1]));
$customer = $client->createCustomer(new Customer(id: '', email: 'ada@example.com', password: 'correct horse'));
if ($customer->password !== null) {
    throw new RuntimeException('expected no password, got ' . $customer->password);
}
if ($customer->email !== 'ada@example.com') {
    throw new RuntimeException('expected the email to hydrate, got ' . $customer->email);
}

echo "PHP_SMOKE_OK\n";
