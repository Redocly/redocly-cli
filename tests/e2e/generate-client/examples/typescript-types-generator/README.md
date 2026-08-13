# TypeScript types generator example

A custom generator that renders real TypeScript types with the
`@redocly/client-generator/generate` entry — the same type renderer the built-in generators
use, so the mapping matches the generated client exactly, instead of guessing at type text
(compare with the plain string-building [`custom-generator`](../custom-generator) example).

- [`response-map-generator.mjs`](./response-map-generator.mjs) — the generator.
  For every operation with a JSON success response it derives the response body's TypeScript type
  with `tsType` and renders `src/api/client.responses.ts`:

  ```ts
  import type { MenuItemList, Order, OrderItem } from './client.js';

  export type ResponseShapes = {
    listMenuItems: MenuItemList;
    getOrderById: Order;
    listOrderItems: OrderItem[];
    // …
  };
  ```

- [`redocly.yaml`](./redocly.yaml) — `generators: [typescript, ./response-map-generator.mjs]`.
- [`src/main.ts`](./src/main.ts) — proves the map matches the client:
  `ResponseShapes['listMenuItems']` is exactly what `listMenuItems()` resolves to.

## Why a separate `/generate` entry

The package root is what a generated package-mode client imports **at app runtime**, so it stays
runtime-only.
The `/generate` entry holds everything that runs at **generation time** — it loads the TypeScript
compiler and `@redocly/openapi-core`, which an app must never pull in:

- the text toolkit used here (`tsType`, `tsJsdoc`, `codeLiteral`, `operationSignature`,
  `pascalCase`, …),
- `generateClient` (also re-exported from the root behind a dynamic import) and
  `collectGeneratedFiles` for in-memory generation.

Import `defineGenerator` and the IR types from the root; import the toolkit from
`@redocly/client-generator/generate`.

## Run

Regenerate from the repo root with `npm run examples:regen -w @redocly/client-generator`;
type-check with `npm run typecheck:examples -w @redocly/client-generator`.
