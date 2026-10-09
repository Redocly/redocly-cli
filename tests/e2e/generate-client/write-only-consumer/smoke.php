<?php

// Runtime smoke for write-only properties in the generated PHP SDK. Run by
// write-only.test.ts with the server's base URL as the only argument. The request sends
// the password; the response comes back without it and must still hydrate.

declare(strict_types=1);

use CafeCustomers\{Client, Config, Customer};

require __DIR__ . '/client/client.php';

$client = new Client(new Config(serverUrl: $argv[1]));
$customer = $client->createCustomer(new Customer(id: '', email: 'ada@example.com', password: 'correct horse'));
if ($customer->password !== null) {
    throw new RuntimeException('expected no password, got ' . $customer->password);
}

var_dump($customer);
echo "PHP_SMOKE_OK\n";
