# ADR 0019: `generate-client` config via a first-class `client` block

- Status: Accepted — supersedes ADR-0008
- Date: 2026-07-17

## Context

ADR-0008 parked `generate-client` settings in an `x-client-generator` extension block plus an optional `*.config.ts` (`--config-file`) layer, explicitly as a stopgap until first-class keys could land.
Both layers existed only because the config schema didn't model client generation yet; keeping them meant two config dialects and an extension key users had to discover.

## Decision

`redocly.yaml` models client generation with **typed, first-class keys**: a top-level `client` block for shared defaults and a per-API `apis.<name>.client` block layered over it field by field (the `pagination` block merges additively), with the output path at `apis.<name>.clientOutput`.
The schema lives in `@redocly/openapi-core`'s config types, so the config is linted like any other block.
Precedence, low → high: **top-level `client` → `apis.<name>.client` → CLI flags**.
The `x-client-generator` extension and the `*.config.ts` / `--config-file` layer are removed.

## Consequences

- One config dialect: everything is declared in `redocly.yaml` and validated by the config schema.
- A no-arg `redocly generate-client` fans out over every API that declares a `client` block or `clientOutput`.
- Programmatic use passes the same vocabulary to `generateClient(...)` directly; there is no separate config-file loader to maintain.
