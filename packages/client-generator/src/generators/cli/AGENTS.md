# The `cli` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

## What it emits

A bin-ready `<stem>.cli.ts`: one command per operation over the sdk's instance client,
with `--help`, a `schema <op>` introspection command, and `--dry-run`.

## Design decisions that must hold

- **Argument shape:** path params positional, query params typed `--kebab-name` flags,
  JSON bodies via `--json '<json>' | @file | @-` (stdin).
- **Exit codes are a contract:** 0 ok, 1 API error, 2 auth, 3 validation, 4 usage.
  Errors print ONE JSON object to stderr so stdout stays pipeable.
- **Credentials come from the environment** (a stem-derived prefix, e.g.
  `CLIENT_TOKEN`) or explicit flags; `--dry-run` prints the prepared request with
  credentials REDACTED.
- **Co-selection aware:** with `zod` selected, requests validate before the network
  (exit 3); without it, the CLI still works.
- Throw-mode only — the exit-code mapping reads thrown `ApiError`s.

## Emitters that implement it

`emitters/cli.ts` (commands + module), plus the sdk's operation types.

## Not ejectable — and the customization path

`redocly eject-generator` covers the standalone language SDKs (`python`, `go`, `php`),
whose entire generator is one self-contained file. This generator is a thin entry over
the SHARED TypeScript emitters listed above, so handing you a copy of the entry would
hand you nothing to customize. Customize the OUTPUT instead:

- `client.setup` bakes publisher defaults into the generated client.
- Middleware and `configure()` change behavior at runtime, not at generate time.
- A custom generator (`defineGenerator`) emits your own artifact beside the client.

Ask for a helper or a knob you're missing rather than working around it — that request
is the roadmap signal.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the emitter modules named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the emitter unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/emitters`), the e2e
   suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
