# ADR 0025: Wrapper generators unwrap a result-mode sdk instead of forbidding it

- Status: Accepted
- Date: 2026-11-11
- Amends: [ADR-0011](./0011-wrapper-generators.md) (the throw-only requirement)

## Context

[ADR-0011](./0011-wrapper-generators.md) made `swr` and `tanstack-query` require `--error-mode throw`, because both libraries expect a fetcher that throws.
The error mode is one generate-time choice for the whole `client` block ([ADR-0005](./0005-error-mode-terminals.md)), so that requirement reached past the wrapper: selecting `tanstack-query` forbade `errorMode: result` for the `typescript` client too, where it is supported.
An application that wants the `{ data, error, response }` result in server code and TanStack Query in client code had to declare the same description as two APIs ([#3325](https://github.com/Redocly/redocly-cli/issues/3325)).

Two alternatives were considered:

- **A per-generator `errorMode`.**
  The wrappers call the `typescript` client they sit beside, and its types are fixed by the mode at generate time.
  A wrapper cannot have a different mode than the one client it wraps, so the option would only move the same error to a new place, or require generating the client twice.
- **A throwing entry point in the runtime** (an exported `unwrapResult`, or a throw-mode twin of each method).
  It widens the public surface of every generated client, including the ones no wrapper is generated for.

## Decision

We will keep the error mode a single choice for the client, and make the wrappers independent of it.

Over a result-mode sdk, `swr` and `tanstack-query` emit one module-private `unwrapResult` helper and route every sdk call through it.
The helper returns the body and throws the `ApiError` a throw-mode sdk would throw (`url`, `status`, `statusText`, and the parsed error body), so a query, mutation, or hook reports a failed request the same way in both modes.
Failure is `!response.ok`, the same test the runtime's page iteration uses, because a bodyless success has no `data` either.

The helper text and the call wrapping live in the typescript generator's published contract (`contracts/typescript.ts`), so both wrappers, and any third one, share them.
The two wrappers drop `errorModes: ['throw']` from their metadata.
Over a throw-mode sdk the emitted modules are unchanged.

`cli`, `go`, `php`, and `java` keep `errorModes: ['throw']`.
The CLI maps thrown errors to exit codes inside its embedded engine, and the Go, PHP, and Java idioms are their error mode.

## Consequences

- `generators: [typescript, tanstack-query]` (or `swr`) works with `errorMode: result`: the client returns results, the wrappers throw.
- A wrapper never constrains the client it wraps; `errorModes` remains for generators that cannot adapt.
- The `onError` middleware hook stays throw-mode only, so the wrappers do not invoke it over a result-mode sdk — the same limit page iteration already has.
- The wrappers' error type is `ApiError` in both modes; the typed `<Op>Error` of result mode is available as `ApiError.body`, untyped.
