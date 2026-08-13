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
- **Credentials come from the environment** — a prefix derived from the bin name
  (`CLIENT_TOKEN`), overridable via `wiring.envPrefix` — or explicit flags; `--dry-run`
  prints the prepared request with credentials REDACTED. Help lists only the credentials
  the description declares, and an unusable `--token` is a usage error, never silently
  dropped.
- **Validation is on by default.** The generator declares `requires: ['typescript', 'zod']` and
  the pipeline pulls prerequisites in automatically, so `--generator cli` alone produces a
  validating CLI — a user shouldn't have to know which other generator provides it. The
  consequence is a zod peer dependency at run time, which the docs state.
- Throw-mode only — the exit-code mapping reads thrown `ApiError`s.
- **Runs under `node --experimental-strip-types` with no build step**, including the
  modules it imports (the sdk and the zod module). Anything emitted must be erasable
  TypeScript; a parameter property anywhere in that import graph breaks the zero-build
  runner.
- **The generated module is a library as well as a binary.** It exports `COMMANDS`,
  `wiring`, and `run`, and self-executes only when it is the process entry — a REALPATH
  comparison of `import.meta.url` against `argv[1]`, because some runners resolve
  symlinks in one but not the other (macOS temp dirs, installed bin symlinks), and a
  plain URL comparison silently runs nothing. `import.meta.main` would be cleaner but is
  absent from our Node floors. Importing the module must be side-effect-safe:
  module-level wiring (zod validation) touches only the module's OWN client, never a
  global.
- **Behavior that is not in the description is composed, never generated.** A custom
  command (`login`, anything) is the operation-command data shape plus a `handler`, so it
  inherits help, parsing, `schema`, and the exit-code contract; `runCli` dispatches it
  instead of the client. The generator itself never learns what such a command does —
  credentials files, login flows, and profiles are user land (or a future satellite),
  by design.
- **One binary can span several descriptions.** `runCli` also accepts sources — each a
  command list plus, optionally, its OWN wiring (own base URL, schemes, credentials)
  behind a namespace, so colliding operationIds across descriptions are simply different
  commands (`cafe shop createOrder`, `cafe kitchen createOrder`). A namespace-less source
  puts commands at the root (`cafe login`); a root command whose name matches a namespace
  is rejected at startup, never shadowed. A source WITHOUT wiring inherits the first
  wired source's — a root `login` shares the composed binary's identity, which is the
  whole point of composing it there.
- **The composed entry is generated, not hand-rolled.** A top-level `client.cliOutput`
  makes `redocly generate-client` (no api argument) emit one entry over every api that
  selected `cli`: the namespace is the api ALIAS from `apis:`, and the credential prefix
  defaults to `<BINNAME>_<ALIAS>` (`CAFE_SHOP_TOKEN`) via `wiring.envPrefix` — which
  exists precisely so the display name and the credential prefix can differ. The composed
  entry exports its `SOURCES` so an adopter layers custom commands around it without
  editing a generated file. Without `cliOutput`, nothing changes.

## Emitters that implement it

`emitters/cli.ts` (commands + module), plus the sdk's operation types.

## Ejecting it

`redocly eject-generator cli` ships this generator BUNDLED with the emitters it uses — one
`.mjs` you own, importing `@redocly/client-generator` and `@redocly/openapi-core`. Change
the command surface, the help layout, or the exit-code mapping, and regenerate. The exit
codes are a contract for scripts, so change them only deliberately.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change the emitter modules named above (the entry is plumbing — it rarely moves).
3. Verify: `npm run compile`, the emitter unit suites
   (`VITEST_SUITE=unit npx vitest run packages/client-generator/src/emitters`), the e2e
   suites for this generator, and the large-description bars
   (`tests/e2e/generate-client/large-descriptions.test.ts`).
