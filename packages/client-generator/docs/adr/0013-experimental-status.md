# ADR 0013: Experimental release status & stabilization criteria

- Status: Accepted
- Date: 2026-06-13

## Context

`generate-client` (and `@redocly/client-generator`) ships a large public surface in one go: CLI flags, the **exact generated output**, the configuration schema, six generators, and a custom-generator plugin API that exposes the IR ([ADR-0012](./0012-plugin-api.md)).
Several of these are hard to walk back once committed to:

- **Generated output is the real lock-in** — consumers commit the generated client to their repos and depend on its exact shape; changing it is a breaking change.
- **The IR is semi-public** through the plugin API (already `@experimental`), so freezing the surrounding feature while the IR moves would be incoherent.
- There are **known deferrals** (`int64`→`bigint`, oauth2 token-flow helpers, a pretty-print pass, no built-in Angular/Valibot) and **little real-world adoption** yet to validate the design.

Committing all of this to semver-stable on day one is a promise we can't yet keep.

## Decision

Release the **entire feature as experimental**.
Its CLI flags, generated output, configuration, and the plugin API may change in any minor release until it is declared stable.

- **Versioning:** `@redocly/client-generator` is versioned **independently, starting at `0.x`** — it is **not** in the monorepo's `fixed` lockstep group (which keeps `@redocly/cli` / `@redocly/openapi-core` / `@redocly/respect-core` in step). A `0.x` version is the semver-native signal that the API may change, and it decouples the experimental package's churn from the stable CLI's version (the CLI bundles it and pins the exact version it ships). It graduates to `1.0.0` when declared stable.
- **Disclosure:** the `0.x` version, the README banner, the command-doc admonition, the changeset entry, and this ADR all state the experimental status and link here.

### Stabilization criteria (what graduates it to stable)

The feature stays experimental until all of the following hold:

1. **Validated against real-world specs** — exercised on a representative set of production OpenAPI descriptions (incl. internal consumers) with no output-shape surprises.
2. **Generated-output shape frozen** — no pending changes to the emitted client/types that would break a committed, generated client.
3. **Plugin IR committed to** — the IR and codegen toolkit re-exported from `@redocly/client-generator` are reviewed and promoted from `@experimental` to stable.
4. **Deferrals decided** — `int64`→`bigint`, oauth2 token-flow helpers, and the formatting/pretty-print pass are each either implemented or explicitly declared out of scope.
5. **Soak period** — a defined window of no breaking changes to flags/output/config before the flag is flipped.

Stabilization is tracked in a public issue linked from the docs; flipping to stable is itself a changelog-worthy change.

## Consequences

- We can refine flags, output, config, and the IR based on real adoption without breaking-change apologies — the experimental label sets that expectation up front.
- The cost is the usual one: some teams defer adopting experimental tooling. For a _codegen_ tool the risk is low — the output lives in the consumer's repo and the version can be pinned.
- "Experimental" must not become permanent: the criteria above are the explicit exit, and graduating to `1.0.0` (with the docs disclaimers dropped) is the signal that they have been met.
- This ADR is the canonical record of the status; superseded when the feature is declared stable.
