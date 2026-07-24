# AST toolkit generator example

A custom generator that builds its output as a real TypeScript AST with the
`@redocly/client-generator/generate` entry — the same `ts.factory` + printer toolkit the built-in
generators use — instead of concatenating strings
(compare with the string-building [`custom-generator`](../custom-generator) example).

- [`response-map-generator.mjs`](./response-map-generator.mjs) — the generator.
  For every operation with a JSON success response it derives the response body's TypeScript type
  with `schemaToTypeNode` and prints `src/api/client.responses.ts`:

  ```ts
  import type { MenuItemList, Order, OrderItem } from './client.js';

  export type ResponseShapes = {
    listMenuItems: MenuItemList;
    getOrderById: Order;
    listOrderItems: OrderItem[];
    // …
  };
  ```

- [`redocly.yaml`](./redocly.yaml) — `generators: [sdk, ./response-map-generator.mjs]`.
- [`src/main.ts`](./src/main.ts) — proves the map matches the client:
  `ResponseShapes['listMenuItems']` is exactly what `listMenuItems()` resolves to.

## Why a separate `/generate` entry

The package root is what a generated package-mode client imports **at app runtime**, so it stays
runtime-only.
The `/generate` entry holds everything that runs at **generation time** — it loads the TypeScript
compiler and `@redocly/openapi-core`, which an app must never pull in:

- the emit toolkit used here (`ts`, `printStatements`, `parseStatements`, `operationSignature`,
  `schemaToTypeNode`, `pascalCase`, …),
- `generateClient` (also re-exported from the root behind a dynamic import) and
  `collectGeneratedFiles` for in-memory generation.

Import `defineGenerator` and the IR types from the root; import the toolkit from
`@redocly/client-generator/generate`.

## Run

Regenerate from the repo root with `npm run examples:regen -w @redocly/client-generator`;
type-check with `npm run typecheck:examples -w @redocly/client-generator`.
