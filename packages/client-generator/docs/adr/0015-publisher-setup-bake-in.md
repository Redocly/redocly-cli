# ADR 0015: Publisher setup bake-in via `--setup`

- Status: Accepted
- Date: 2026-06-26

## Context

[ADR-0014](./0014-request-response-customization.md) settled request/response customization as a **runtime** contract a _consumer_ composes (`configure`/`use` from their own module), and deliberately ruled out stitching consumer code into the generated output.

But an API provider **publishing an SDK on npm** has a different need: they want the generated client to ship with _their_ cross-cutting defaults already wired in — base URL, retry, a header injector, an idempotency-key middleware — so their downstream users `npm install` it and call operations with no `configure`/`use` of their own. Today only `baseUrl` can be baked (it is inlined); everything else is runtime-only.

The obvious shape — a setup file that imports `configure`/`use` from `./client` and calls them — fails twice: the generated client does not exist when the setup is authored (the import will not resolve), and side-effecting calls against a per-client `configure`/`use` cannot be meaningfully unit-tested. The publisher actor is therefore a distinct, opt-in **build-time** concern, and must not break the zero-dependency guarantee ([ADR-0002](./0002-typescript-peer-dep.md)).

## Decision

Add a `--setup <file>` flag (config key `setup`) that **bakes a publisher setup module into the single-file client**.

The setup module imports its contract — `defineClientSetup` plus the runtime types (`RequestContext`, `Middleware`, `ClientSetupConfig`, …) — from the package's main entry `@redocly/client-generator`, and **returns** an inspectable object rather than calling side-effecting functions:

```ts
export default defineClientSetup({ config: { baseUrl: '…', retry: { … } }, middleware: [ … ] });
```

This resolves the chicken-and-egg (the contract lives in the package, not the not-yet-generated client) and makes the setup **unit-testable in isolation** (its middleware are plain functions on an object). To support it, the package now exports a canonical, spec-independent **runtime-contract module**, kept in lockstep with the emitted runtime types by a test.

The baker (`setup-bake.ts`) parses the module, **rejects any import other than `@redocly/client-generator`** (preserving zero-dep), strips the (type-only) package import, extracts the `defineClientSetup` argument, and emits a collision-safe `{ … }` block — `configure(config)` + `use(...middleware)` — appended to the single-file client after `configure`/`use` are defined. Baked calls run first on import; a consumer's own `configure`/`use` merge/append on top, so defaults stay overridable.

`--setup` applies across **all output modes and both facades**, via a single source of truth — a module-scoped `__redoclySetup` object (emitted in the shared http module in multi-file layouts, exported so per-tag service classes can import it):

- **Functions facade**: after `configure`/`use` are defined, the emitter applies `configure(__redoclySetup.config ?? {})` + `use(...(__redoclySetup.middleware ?? []))`. In multi-file this lives in the http module, which the entry imports, so it runs on load for every layout.
- **Service-class facade**: the generated class constructor merges `__redoclySetup` into its per-instance `this.config` (`{ ...baked, ...passed }`, baked middleware first), so `new Client()` gets the defaults and `new Client(override)` merges on top.

This **refines** ADR-0014 (it does not supersede it): ADR-0014's "no stitching consumer code" governs _consumer self-customization_; publisher bake-in is a separate, explicit build-time seam.

**Override semantics.** The baked block runs first (at import). A consumer's own customization then layers on with two distinct rules: scalar `ClientConfig` fields (`fetch`/transport, `baseUrl`, `headers`, `retry`, the single hooks) are a single slot set via `configure` (`Object.assign`) — **last write wins, so the consumer overrides the baked default** (a consumer `config.fetch` _replaces_ a baked transport rather than wrapping it). Middleware registered via `use` **composes** — baked middleware appended first, consumer middleware after; both run (`onRequest` in order, `onResponse` reversed). A publisher who needs un-bypassable behavior should express it as middleware, not a baked `config.fetch`.

## Consequences

- A published SDK can ship its request/response defaults built in; downstream users get them with zero setup and can still override.
- The package gains a real, documented home for the runtime contract types (`@redocly/client-generator` main entry) — overdue, and the basis for testable setup modules.
- Zero-dependency output is preserved: the import allowlist forbids third-party imports in a setup file, and the `defineClientSetup` helper is stripped at bake time (never imported by the generated client).
- The setup contract (`defineClientSetup` + the runtime types) is now public surface that must stay in lockstep with the emitted runtime; a unit test guards the spec-independent types against drift.
- Works across all output modes and both facades from one `__redoclySetup` source of truth: in multi-file layouts it lives in the shared http module (exported for service-class so per-tag classes import it), so non-setup clients stay byte-identical.
- Top-level `await` in a setup file is unsupported (the baked block is synchronous); revisit only on demand.
