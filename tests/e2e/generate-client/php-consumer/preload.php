<?php

// The opcache.preload script of a production PHP setup: load the client once so
// OPcache keeps its classes in shared memory for every later request.

declare(strict_types=1);

require __DIR__ . '/client/client.php';
