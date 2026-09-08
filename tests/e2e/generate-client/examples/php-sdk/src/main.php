<?php

// Consume the generated PHP SDK: promoted-constructor classes over the curl extension.

declare(strict_types=1);

require __DIR__ . '/api/client.php';

use RedoclyCafe\{Client, Config};

$client = new Client(new Config());
$menu = $client->listMenuItems(limit: 3);
foreach ($menu->items as $item) {
    echo $item['name'], PHP_EOL;
}
