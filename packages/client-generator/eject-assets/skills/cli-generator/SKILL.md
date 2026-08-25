---
name: cli-generator
description: Design of the ejected Redocly `cli` client generator. Read it, and update it, before changing generators/cli/.
---

# The `cli` generator — its skill

This file is the DESIGN of your ejected `cli` generator (`generators/cli/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/cli/` that has no covering sentence here is incomplete.

## What it emits

A bin-ready `<stem>.cli.ts`: one command per operation over the sdk's instance client,
with `--help`, a `schema <op>` introspection command, and `--dry-run`.

With `client.docs` (or `--docs`), the `docs` hook also writes `<stem>.cli.md`: the usage
line, the global flags, the credential variables, the exit-code table, and one section per
command with its positionals and flags.

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
- **The CLI names itself from `process.argv[1]`.** Only the operator's `bin` field decides
  what the command is called, so help reads the invoked name back instead of printing a
  name from generation that may not exist on the machine.
- **Credentials come from the environment** — `wiring.envPrefix`, the constant-cased output
  stem (`CLIENT_TOKEN`), which a composed entry sets per api alias — or explicit flags;
  `--dry-run` prints the prepared request with credentials REDACTED. The prefix is fixed at
  generation on purpose: a renamed binary must keep reading the variables a published CLI
  already documents. Help lists only the credentials the description declares, and an
  unusable `--token` is a usage error, never silently dropped.
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

- **The CLI documents itself.** The page is this generator's `docs` hook, not a separate
  generator: nothing else knows this tool's commands, and a reader who ejects `cli` gets
  the page layout with it. The page renders from `commandData` — the same table `runCli`
  dispatches on — so it cannot describe a tool other than the one beside it. A capability
  reaches the page only by being in that table. The page is Markdown that survives a
  linter (ATX headings, a blank line around every block, no hard tabs, one sentence per
  line) and it escapes what descriptions contain, because a summary is arbitrary text.

## The stage files

`render.ts` derives `commandData` from the IR and renders the module and the composed
entry; `docs.ts` renders the reference page from the same command table;
`engine-source.ts` supplies the cli engine's source text — the engine itself (`runCli`,
the parser, help, dispatch) ships inside the package and arrives through
`@redocly/client-generator/runtime-sources` (in this repo it lives in `runtime/cli.ts`
beside these files). `index.ts` is the entry. The sdk calling convention comes from
`@redocly/client-generator/contracts/typescript`.

## Ejecting it

`redocly eject-generator cli` copies this generator's TypeScript source folder to
`generators/cli/`, exactly as we wrote it, importing `@redocly/client-generator`,
`@redocly/client-generator/contracts/typescript`,
`@redocly/client-generator/runtime-sources` (the embedded cli engine), and
`@redocly/openapi-core`. Running a `.ts` generator uses Node's type stripping (Node
22.18, 23.6, or newer); newer built-in versions merge in per file with `--update`. Change
the command surface, the help layout, or the exit-code mapping, and regenerate. The exit
codes are a contract for scripts, so change them only deliberately.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/cli/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator cli --update`.
