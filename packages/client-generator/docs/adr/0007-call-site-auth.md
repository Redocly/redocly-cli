# ADR 0007: Auth resolved at the call site via async `__auth`

> **Note (2026-07):** Superseded by [ADR-0017](./0017-runtime-module-and-descriptor-client.md) — the module-global credential slots and emitted `__auth` call sites are gone; credentials are per instance (`ClientConfig.auth`) and resolved by the runtime's `resolveAuth` capability.

- Status: Accepted (extended by [ADR-0009](./0009-per-instance-auth.md))
- Date: 2026-06-10

## Context

Security schemes vary (HTTP bearer/basic, apiKey in header/query/cookie) and credentials may be async (a token provider returning a `Promise`).
We want all of this handled without bloating the shared runtime with auth branching, and without emitting auth code into operations that don't need it.

## Decision

Credentials are resolved **at the call site**, not inside the runtime fetch wrapper.
`renderAuth` (`emitters/auth.ts`) emits module-scoped credential slots, the `set*` setters (accepting a `TokenProvider` = value-or-`(() => string | Promise<string>)` for bearer/apiKey; `setBasicAuth` stays sync), and an **async** `__auth(schemes): Promise<{ headers, query }>` that awaits each resolvable credential.
Every authed operation emits `const __a = await __auth([...])`, spreads `...__a.headers`, and (for `apiKeyQuery` keys, threaded via `queryAuthKeys`) merges `...__a.query` into the URL builder.
Non-authed operations emit **no** auth code at all.

## Consequences

- All auth — header/query/cookie, sync/async — lives in one place next to URL building, with zero churn to the runtime fetch wrapper.
- Operations pay only for the auth they use; unauthenticated ops stay clean.
- Auth resolution is per-call (awaited each request), which is the correct behavior for rotating/async tokens; the small overhead is acceptable.
