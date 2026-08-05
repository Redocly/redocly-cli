# The `cli` generator — its skill

This file is the generator's DESIGN and governs our own changes: **to change the
generator, edit this skill first, then make the code match it.**

## What it emits

A bin-ready `<stem>.cli.ts`: one command per operation over the sdk's instance client,
with `--help`, a `schema <op>` introspection command, and `--dry-run`.

## Design decisions that must hold

- **Argument shape:** path params positional, query params typed `--kebab-name` flags,
  JSON bodies via `--json '<json>' | @file | @-` (stdin).
- **Help is the whole interface.** A flag that exists but isn't in `--help` doesn't exist
  to the user, so the top-level help carries a `Global flags:` section (`--server-url`,
  `--format`, `--dry-run`, `--page-all`, `--output`, `--token`, `--json`) plus the
  credential environment variables. Descriptions are collapsed to ONE line — an OpenAPI
  description with newlines otherwise breaks the alignment of every following flag. The
  footer names the form that actually works for a grouped API
  (`<bin> <group> <command> --help`).
- **Commands are addressable the way a shell allows.** A group slug is kebab-cased so a
  multi-word OpenAPI tag can be typed without quoting, while help shows the original tag.
  A bare operationId resolves to its grouped command when unambiguous.
- **Exit codes are a contract:** 0 ok, 1 API error, 2 auth, 3 validation, 4 usage.
  Errors print ONE JSON object to stderr so stdout stays pipeable.
- **The bin name is a command name, not a filename.** It defaults to the output stem with
  dots and other non-word characters folded to `-` (`openapi.client` → `openapi-client`),
  because the stem follows the TypeScript file convention and a usage line reading
  `openapi.client orders …` looks like a path. `client.binName` overrides it.
- **Credentials come from the environment** (a stem-derived prefix, e.g.
  `CLIENT_TOKEN`) or explicit flags; `--dry-run` prints the prepared request with
  credentials REDACTED.
- **Validation is on by default.** The generator declares `requires: ['sdk', 'zod']` and
  the pipeline pulls prerequisites in automatically, so `--generator cli` alone produces a
  validating CLI — a user shouldn't have to know which other generator provides it. The
  consequence is a zod peer dependency at run time, which the docs state.
- Throw-mode only — the exit-code mapping reads thrown `ApiError`s.
- **Runs under `node --experimental-strip-types` with no build step**, including the
  modules it imports (the sdk and the zod module). Anything emitted must be erasable
  TypeScript; a parameter property anywhere in that import graph breaks the zero-build
  runner.

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
