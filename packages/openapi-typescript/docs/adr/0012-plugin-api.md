# ADR 0012: Experimental custom-generator (plugin) API

- Status: Accepted (experimental)
- Date: 2026-06-13

## Context

The built-in generators ([ADR-0004](./0004-registry-seams.md)) cover common targets (sdk, zod,
tanstack-query, swr, transformers, mock). They cannot cover the long tail: outputs that are
org-specific (a house-style SDK wrapper, a UI permissions map) or niche (validators in a library we
don't ship, mocks in another test runner's format). Today a user's only options are forking the tool
or writing a separate program that re-parses the spec. The registry seam is already shaped to admit
more generators — the question was whether, and how, to open it to third parties without
compromising the dependency-free client ([ADR-0002](./0002-typescript-peer-dep.md)) or locking the
IR's shape prematurely.

## Decision

Open the `getGenerator` registry as a **public, experimental** API for **custom generators only**
(not writers or AST hooks). A custom generator is the internal `GeneratorDescriptor` plus a `name`:
`{ name, run, requires?, facades?, errorModes?, dateTypes? }`, where `run(input) => GeneratedFile[]`
receives the same IR the built-ins do.

- **Loading is dual.** A `generators` entry resolves as a built-in name, an inline `customGenerators`
  entry (from a `defineConfig` file — type-safe, no dynamic import), or an **import specifier** (a
  path resolved against the config dir, or an installed package) that is dynamically `import()`ed and
  default-exported (mirroring how config files load). A new `resolveGenerators` performs this before
  emission, producing a name→descriptor registry that `validateGenerators` and the run loop consume.
- **Surface + stability.** A dedicated `@redocly/openapi-typescript/plugin` entry exports
  `defineGenerator`, the IR types, and a curated codegen toolkit (`ts`, `printStatements`,
  `parseStatements`, `operationSignature`, `schemaToTypeNode`, `pascalCase`, `safeIdent`) — the same
  internals the built-in generators use, re-surfaced (no new logic). The whole surface is
  **`@experimental`**: it may change between minor versions until real plugins exercise it and it is
  stabilized.
- **Fail fast.** Collisions (a custom name equal to a built-in or another custom), invalid exports,
  unloadable specifiers, and unmet `requires`/`facades`/`errorModes`/`dateTypes` all throw an
  actionable error before any file is written.

## Consequences

- The long tail is addressable without forking; a generator is a small module against a stable IR,
  and is a first-class peer of the built-ins (same model, same toolkit).
- The generated client stays dependency-free — a generator's output is its own file, and its target
  libraries are peers of the consumer's app, not the client.
- **Trust:** import-specifier generators execute arbitrary code at generation time — the same trust
  level as any installed dependency or `defineConfig` file. Not sandboxed (out of scope); documented.
- **Commitment is deferred:** marking the surface experimental keeps the IR and toolkit free to
  evolve while the API is proven; graduating it to stable is future work.
- **Out of scope (v1):** custom writers / output modes, emitter/AST hooks, per-plugin options
  passthrough, and a plugin marketplace.
