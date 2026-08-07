#!/usr/bin/env node

import nodeModule from 'node:module';

// Reusing V8's on-disk code cache cuts about 40ms off startup. Available from Node 22.8.
nodeModule.enableCompileCache?.();

// Imported dynamically so the cache is enabled before the bundle is compiled.
await import('../lib/index.js');
