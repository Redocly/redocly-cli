# ADR 0009: Per-instance auth via `ClientConfig.auth`

> **Note (2026-07):** The decision (per-instance `ClientConfig.auth`) stands, but the mechanism text is superseded by the runtime-module architecture — the module-global setter slots and `__auth` are gone; the generated `set*` setters are now sugar over `client.auth.*`; see [ADR-0017](./0017-runtime-module-and-descriptor-client.md).

- Status: Accepted
- Date: 2026-06-10

## Context

[ADR-0007](./0007-call-site-auth.md) resolves credentials at the call site, but from **module-global** slots (`setBearer`/`setBasicAuth`/`setApiKey*`).
The `service-class` facade exists to run **multiple independent client instances** — yet global auth means every instance of a generated module shares one credential.
Real adoption hit this: two clients of the _same_ generated module needing different HTTP Basic credentials (e.g. an internal vs. a public syncer client), which the globals cannot represent.
The workaround — injecting `Authorization` via per-instance `config.headers` — bypasses the spec's per-operation `security`, sending the header even to endpoints that don't declare it.

## Decision

Add an optional **`auth?: AuthCredentials`** to `ClientConfig`, carrying per-instance credentials, and thread the config into the resolver: `__auth(schemes, config)`.
Each scheme resolves from `config.auth?.<scheme> ?? <global slot>` — the per-instance value wins, the global setters remain the fallback.
`AuthCredentials` mirrors the schemes the spec declares: `{ bearer?: TokenProvider; basic?: { username; password }; apiKey?: Record<string, TokenProvider> }`.
It is emitted only when the client has injectable schemes (so non-auth clients are byte-identical), and works for both facades (the functions facade sets it once via `configure({ auth })`).

## Consequences

- The service-class facade can finally run independent instances with independent credentials — its reason to exist.
- **Backward compatible:** the global setters are unchanged and remain the fallback; the functions facade is unchanged unless `auth` is set.
- Unlike the header workaround, it still honors each operation's declared `security` (only declared schemes are sent).
- **Extends** ADR-0007 rather than superseding it — credentials are still resolved at the call site; the source is now "config-then-global" instead of "global only".
