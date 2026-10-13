---
'@redocly/client-generator': minor
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `onSettled` middleware hook to the generated TypeScript client: it runs once per call, after the last retry, with the final outcome.
Added the `client.telemetry` option to the `generate-client` command: with `telemetry: on`, the `typescript` generator also writes an opt-in middleware that counts SDK calls per operation and sends aggregated usage without request data.
