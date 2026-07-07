# Deterministic API map generation without bundling

The `map` command produces a tree index that tools — including LLM-based agents — can navigate to retrieve relevant sections of an API description.
It is named `map` (an API map, like a sitemap for agents) rather than `toc`:
the artifact is a navigable index, and "table of contents" is book vocabulary that doesn't extrapolate to AsyncAPI or Arazzo.
API descriptions already carry explicit structure and native `summary`/`description` fields,
so map generation is fully deterministic: no LLM calls, no network, testable with snapshots.

We walk the ORIGINAL resolved document (lint-style: `resolveDocument` + `walkDocument`), not the bundled one,
even though `stats` bundles first.
The bundler keeps no per-node map from bundled locations back to source files,
while the walker's resolved locations give original `{file, pointer}` per node for free (exposed via `--source-locations`),
and the canonical pointer is reconstructed from the walk key path.
This also avoids bundle-time component renaming.

The canonical JSON pointer IS the node id — no synthetic sequential ids,
because pointers are stable across regenerations and double as the retrieval address.
A node's `kind` is the internal node type name the walker reports (`PathItem`, `Operation`, `Channel`) —
the type system is the single source of node names, per spec.

## Update: opt-in AI refinement

`--with-ai` (with `--ai-provider`/`--ai-model`) later added an opt-in enrichment step that asks an AI provider for improved node summaries.
It does not change this decision: the default path stays fully deterministic, the provider can only contribute summary strings merged by pointer (never structure), and any failure falls back to the deterministic map.

## Consequences

- The map's pointers address the logical document as authored; `bundle` output may store `$ref`ed components under different keys.
- Adding a spec means adding a visitor to the spec-version switch in `packages/core/src/api-map/build-api-map.ts`, not redesigning.
