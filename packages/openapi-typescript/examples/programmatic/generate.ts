// Generate the client *programmatically* with `generateClient(...)` — the API behind the
// `redocly generate-client` CLI — instead of a `redocly.yaml`. Run: `npm run generate`.
// (The CI drift-check sets `OUT` to redirect the output to a temp dir.)
import { generateClient } from '@redocly/openapi-typescript';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const result = await generateClient({
  input: join(here, 'openapi.yaml'),
  output: process.env.OUT ?? join(here, 'src/api/client.ts'),
  outputMode: 'single', // 'single' | 'split' | 'tags' | 'tags-split'
  facade: 'functions', // 'functions' | 'service-class'
  argsStyle: 'flat', // 'flat' | 'grouped'
  errorMode: 'throw', // 'throw' | 'result'
  generators: ['sdk'], // add 'zod' | 'tanstack-query' | 'transformers'
});

console.log(`Wrote ${result.files.length} file(s), ${result.bytes} bytes to ${result.outputPath}`);
