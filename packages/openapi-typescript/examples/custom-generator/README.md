# Custom generator (plugin) example

Shows the **experimental** custom-generator API: a `generators` entry that is a path to a local
generator runs alongside the built-in `sdk`, reading the same OpenAPI-derived IR.

- [`route-map-generator.mjs`](./route-map-generator.mjs) — the custom generator. Walks the IR's
  operations and emits `src/api/client.routes.ts`: `<operationId>: 'METHOD /path'`.
- [`redocly.yaml`](./redocly.yaml) — `generators: [sdk, ./route-map-generator.mjs]`.
- [`src/main.ts`](./src/main.ts) — imports both the client and the generated `routes` map.

Regenerate from the repo root with `npm run examples:regen -w @redocly/openapi-typescript`; type-check
with `npm run typecheck:examples -w @redocly/openapi-typescript`. See the "Custom generators" section
of the command reference for the
authoring contract and the `@redocly/openapi-typescript/plugin` toolkit.
