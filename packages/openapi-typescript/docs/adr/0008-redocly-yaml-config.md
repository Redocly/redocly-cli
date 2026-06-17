# ADR 0008: `generate-client` config via `redocly.yaml` `x-openapi-typescript`

- Status: Accepted
- Date: 2026-06-10

## Context

`generate-client` settings could live in a dedicated `defineConfig` file (`*.config.ts`), but Redocly users expect a single project config — `redocly.yaml`.
First-class config keys belong in the `@redocly/config` package (a separate repo), which doesn't model client-gen settings yet.
We want redocly.yaml-driven generation **now**, without blocking on that release.

## Decision

`generate-client` reads its options from an **`x-openapi-typescript` extension block** in `redocly.yaml`.
The `x-` prefix is the tolerated-extension convention, so no `@redocly/config` schema change is needed — and `@redocly/openapi-core` already preserves the block verbatim in `config.resolvedConfig`.
The CLI extracts it, resolving relative `input`/`output` against the redocly.yaml directory.
Precedence, low → high: **`redocly.yaml` block → `--config-file` (the `*.config.ts`, retained) → CLI flags**.
Examples ship a `redocly.yaml` and run `redocly generate-client` with no flags.

## Consequences

- One project config; `redocly generate-client` works with no flags by auto-discovering `redocly.yaml`.
- No core/`@redocly/config` change required yet; when first-class keys land, the `x-` block can be swapped for typed fields (a future ADR will supersede this).
- The dedicated `*.config.ts` path stays available (via `--config-file`) for configs outside the project or in nested folders.
