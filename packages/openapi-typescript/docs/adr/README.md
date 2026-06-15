# Architecture Decision Records

Immutable, point-in-time records of the significant, hard-to-reverse decisions behind
`@redocly/openapi-typescript`. Each ADR captures the **context**, the **decision**, and its
**consequences** at the time it was made. ADRs are not edited as the code evolves — when a decision is
revisited, add a new ADR that supersedes the old one (and mark the old one `Superseded by ADR-NNNN`).

For the **descriptive** map of how the package is built today (pipeline, module map, seams), see
[`../../ARCHITECTURE.md`](../../ARCHITECTURE.md). ARCHITECTURE.md says _what is_; these ADRs say _why_.

## Index

| #                                          | Decision                                                           | Status                  |
| ------------------------------------------ | ------------------------------------------------------------------ | ----------------------- |
| [0001](./0001-ast-codegen.md)              | Generate TypeScript via the TS AST (`ts.factory`), not strings     | Accepted                |
| [0002](./0002-typescript-peer-dep.md)      | `typescript` as a peer dep; zero-runtime-dependency output         | Accepted                |
| [0003](./0003-spec-agnostic-ir.md)         | A spec-agnostic IR as the builder↔emitter contract                 | Accepted                |
| [0004](./0004-registry-seams.md)           | First-party `getGenerator` / `getWriter` registry seams            | Accepted                |
| [0005](./0005-error-mode-terminals.md)     | Error handling as a generate-time mode (throw vs result)           | Accepted                |
| [0006](./0006-sse-namespace.md)            | SSE as a derived response kind under an `sse.*` namespace          | Accepted                |
| [0007](./0007-call-site-auth.md)           | Auth resolved at the call site via async `__auth`                  | Accepted (ext. by 0009) |
| [0008](./0008-redocly-yaml-config.md)      | `generate-client` config via `redocly.yaml` `x-openapi-typescript` | Accepted                |
| [0009](./0009-per-instance-auth.md)        | Per-instance auth via `ClientConfig.auth`                          | Accepted                |
| [0010](./0010-mock-data-baked-vs-faker.md) | Mock data: baked literals by default, faker opt-in                 | Accepted                |
| [0011](./0011-wrapper-generators.md)       | Data-fetching wrapper generators (`swr`, `tanstack-query`)         | Accepted                |
| [0012](./0012-plugin-api.md)               | Experimental custom-generator (plugin) API                         | Accepted (experimental) |
| [0013](./0013-experimental-status.md)      | Experimental release status & stabilization criteria               | Accepted                |

## Template

```md
# ADR NNNN: <short decision title>

- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD

## Context

What forces are at play — the problem, constraints, and alternatives considered.

## Decision

The choice made, stated in active voice ("We will …").

## Consequences

What becomes easier and what becomes harder as a result. Include the trade-offs accepted.
```
