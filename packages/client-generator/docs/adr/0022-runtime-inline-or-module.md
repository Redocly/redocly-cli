# ADR 0022: Runtime distribution is inline or a sibling module; package mode is removed

- Status: Accepted
- Date: 2026-08-21
- Amends: [ADR-0017](./0017-runtime-module-and-descriptor-client.md) (point 3)

## Context

[ADR-0017](./0017-runtime-module-and-descriptor-client.md) made the runtime a hand-written module and offered two distributions: `inline` (default — the runtime embedded in the generated file, preserving [ADR-0002](./0002-typescript-peer-dep.md)'s zero-dependency promise) and `package` (the client imports `@redocly/client-generator`, so runtime fixes arrive by `npm update` with no regeneration).

Making generators self-contained, ejectable folders ([ADR-0020](./0020-self-contained-generator-folders.md)) puts package mode in direct conflict with the rest of the architecture, in five places:

1. **It contradicts the package's headline.** Package mode is the one mode in which the generated client has a dependency.
2. **It is the sole reason the root entry is constrained.** `entry-weight.test.ts` exists only because package-mode clients import the package root at app runtime — that is what forces the root free of `typescript`, `openapi-core`, and Node builtins, and forces `generateClient` to reach the pipeline through a dynamic import.
3. **It creates a silent-divergence trap.** Once a user ejects the generator and edits `runtime/retry.ts`, inline mode picks the change up and package mode does not — with no diagnostic. `PACKAGE_SPECIFIER` is a hardcoded const in `client-assembly.ts`, so their runtime is not reachable at all.
4. **It forces the TypeScript runtime to be dual-purpose** — both the text embedded into generated clients and the package's own exported runtime — which is the one thing blocking the runtime from living inside its generator's folder.
5. **It is an axis in the generator contract.** `runtimes?: ('inline' | 'package')[]` is declared per generator and checked by `validateGenerators`; php declares it does not support package mode.

Package mode's real purpose is deduplication: do not inline about 1500 lines into every client.
That purpose does not require npm.

A related finding is that inline mode, not module mode, is the one carrying machinery.
`assembleInlineRuntime` embeds `RUNTIME_SOURCES_STRIPPED` — modules with their syntax removed so they can concatenate into one file — and `pythonGenerator` strips `from __future__` lines and every intra-runtime `from ._x` import for the same reason.
A sibling `runtime/` folder needs none of that: the real sources are written as they are, imports intact.

## Decision

**`runtime` is `'inline' | 'module'`. Package mode is removed.**

1. **`inline` stays the default** — one self-contained file with the runtime embedded, exactly as today.
2. **`module` writes the runtime as real files in a `runtime/` folder** beside the generated client, which imports it relatively.
   Only the modules the API needs are written; the capability-seam assembly from [ADR-0017](./0017-runtime-module-and-descriptor-client.md) point 4 is unchanged, and the generated `createClient` factory becomes a file in that folder rather than a concatenated block.
3. **Both modes are available for every generator that embeds a runtime** — `typescript`, `python`, `go`, `php`, `cli`.
   Module mode is more idiomatic than inline for two of them: Python's runtime is naturally `_send.py`, `_auth.py`, …, and Go packages span files by design.
4. **The runtime moves into its generator's folder** — `generators/typescript/runtime/*.ts`, `generators/python/runtime/*.py`, `generators/go/runtime/runtime.go`, `generators/php/runtime/runtime.php`, `generators/cli/runtime/cli.ts`.
   Generators that embed no runtime (`zod`, `mock`, `swr`, `tanstack-query`, `transformers`) have no `runtime/` folder; `swr` and `tanstack-query` emit hooks that import the generated SDK module, so there is nothing for them to embed.
5. **The `runtimes` field leaves the generator contract**, along with the `--runtime package` CLI choice and its validation path.
6. **The root entry stops exporting the client runtime.** `createClient`, `ApiError`, `TimeoutError`, `mergeSetup`, `defaultRetryOn`, `runCli`, `invokedName`, and the runtime's type surface are removed — package mode was their reason for being public, and nothing imports the package root at app runtime any more.
   The root keeps the authoring toolkit, the plugin API, the user-facing config types, and the setup contract.
7. **The setup contract moves up a layer.** `runtime-contract.ts` today re-exports `Middleware`, `RequestContext`, and `RetryConfig` _from_ `runtime/types.ts`, deliberately, so a publisher's `--setup` file cannot drift from the generated output ([ADR-0015](./0015-publisher-setup-bake-in.md)).
   With the runtime inside a generator folder, that direction would make the package root reach into `generators/typescript/`, so it inverts: the contract types are defined at package level and the TypeScript runtime imports them.
   One definition either way — ownership moves from the runtime to the contract, which is the layer users actually author against.

## Consequences

- The self-contained folder structure becomes possible: no dual-purpose runtime, no re-export from the root into a generator folder, no top-level `runtime/` directory.
- The silent-divergence trap is gone. Whatever is in the user's `runtime/` folder **is** the runtime, in both modes.
- **`entry-weight.test.ts` is deleted, not relaxed.** With no app-runtime consumer of the package root, the rule it enforced — no `typescript`, no `openapi-core`, no Node builtins in the root's static graph — stops existing, and the dynamic `import('./pipeline.js')` inside `generateClient` is no longer forced by it.
  The root entry becomes what it should have been: the authoring surface.
- Module mode gives package mode's deduplication without npm, without publishing, and while staying zero-dependency — and it needs no source stripping.
- **Cost: this is a breaking change for `runtime: 'package'` users**, and it withdraws the benefit ADR-0017 led with. Those users lose the `^`-range channel for runtime fixes and must regenerate instead — one command, but not nothing. The package is experimental at 0.x ([ADR-0013](./0013-experimental-status.md)) and the default was always `inline`, which bounds the blast radius; module mode is the migration path.
- **Cost: anyone importing the client runtime from the package root breaks.** That was package mode's surface, but it was public, and there is no deprecation window — the experimental status is doing the work here.
- The `--setup` contract keeps working: `bakeSetup` already strips the package import, so `defineClientSetup` and its types stay a compile-time-only surface ([ADR-0015](./0015-publisher-setup-bake-in.md)) — now defined at package level rather than re-exported from the runtime.
