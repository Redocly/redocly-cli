# ADR 0023: One usage telemetry event for every SDK language, through a settled hook

- Status: Accepted
- Date: 2026-10-30

## Context

`client.telemetry: on` made the `typescript` generator write a usage telemetry module.
The module is a middleware with one hook, `onSettled`, which the TypeScript runtime calls once per call after the last attempt.
The `go`, `python`, and `php` generators wrote nothing, and their runtimes had only per-attempt hooks.
Every SDK sends to one pipeline, so a second event shape per language would split every query on it.

## Decision

1. **Each runtime gets a settled hook**: Go `Middleware.OnSettled`, Python `on_settled`, PHP `Config->onSettled`.
   It runs once per call, after the last attempt, with the final response or error, the attempt count, and the duration.
   The telemetry module is one user of the hook, so a client generated without `telemetry: on` holds no telemetry code and its file does not change.
2. **Each language has one hand-written telemetry source** in `generators/<language>/telemetry/`, snapshotted at prepare time and exported from `@redocly/client-generator/runtime-sources`, like the runtimes.
   The generator writes it as a sibling file and replaces only the version marker and, for Go and PHP, the package or namespace line.
3. **Every language sends the same event**: the same OTLP/HTTP JSON request, attribute keys, outcome classes, duration buckets, window, keep-or-drop rule, and kill switches as the TypeScript module.
   Only `sdk.language`, `sdk.runtime`, and `sdk.runtime_version` differ.
   The end-to-end test of each language decodes the request with one shared helper and asserts the same keys.
4. **The Go and PHP telemetry names are reserved for every SDK.** Those files share the package or namespace with the model types.
   The reservation does not depend on the option, so turning telemetry on never renames a type.

## Consequences

- Telemetry for a new language is a hook in its runtime plus one source file; the event contract does not change.
- The three modules must change together with the TypeScript one. The shared test helper catches a drift in the event shape, not in the window or retry behavior.
- Exit behavior follows each language: Go has no exit hook, so the application calls `Flush`; Python flushes at `atexit`; PHP flushes in a shutdown function, synchronously, which can add up to 3 seconds to the end of a request.
- Python and PHP open server-sent event streams outside the request core, so those requests reach no middleware and are not counted.
