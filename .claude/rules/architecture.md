# Repository architecture

Where things live, so a change lands in the right package.

This is a TypeScript monorepo with npm workspaces containing five packages:

## `packages/core` (@redocly/openapi-core)

The heart of the project.
Handles all OpenAPI/AsyncAPI linting, validation, bundling, and decoration logic.
This package is also used in external apps such as `language-server` and `vs-code-extension`.

Key directories:

- `src/rules/` — Built-in linting rules, organized by spec type (`oas2/`, `oas3/`, `oas3_1/`, `async2/`, `async3/`, `arazzo/`, `common/`). Each rule is its own file.
- `src/config/` — Configuration loading and resolution (reads `redocly.yaml`).
- `src/decorators/` — Built-in decorators for transforming API descriptions.
- `src/bundle/` — Bundling logic that resolves `$ref` across multiple files.
- `src/resolve.ts` — Document resolution for multi-file specs (local and remote).
- `src/types/` — TypeScript type definitions for OAS2, OAS3, AsyncAPI, Arazzo.

## `packages/cli` (@redocly/cli)

User-facing CLI layer built on top of core.
Uses yargs for argument parsing.

- `src/index.ts` — Main command dispatcher.
- `src/commands/` — One file per command.
- Commands use `commandWrapper()` for consistent output, config loading, config linting, and exit codes (0 = success, 1 = execution error, 2 = config error).

## `packages/respect-core` (@redocly/respect-core)

API contract testing framework.
Validates real API responses against OpenAPI/Arazzo specs.

- `src/run.ts` — Test execution logic.
- `src/modules/` — Core testing modules, including runtime expression evaluation.

## `packages/reunite-integration` (@redocly/reunite-integration)

Everything that talks to the Redocly platform (Reunite): the API client, authentication, and the
functions behind the `push`, `push-status`, `login`, `logout`, and `scorecard-classic` commands.
Keep Reunite API calls and credential handling here, not in `packages/cli`.
The package is also published so other programs, such as GitHub actions, can call it, so its
functions take plain options and return data: no `argv`, no spinner, and no printed output.
Scorecard fetching, target matching, and validation report configuration failures as
`HandledError` from core, which the CLI wrapper prints without a stack trace.
The CLI command handler in `packages/cli/src/commands/` maps `argv` to those options, renders the
result, and maps the remaining errors to `HandledError`.

- `src/api/` — the Reunite API client, residency and domain resolution, and the wire types.
- `src/auth/` — the OAuth device flow and the encrypted credentials store.
- `src/push.ts`, `src/push-status.ts` — `pushFiles`, `getPushStatus`, and `waitForDeployment`.
- `src/scorecard-classic/` — fetching a project's scorecard and plugins, target matching, plugin
  evaluation, and `validateScorecard`.

## `packages/client-generator` (@redocly/client-generator)

Experimental package for generating clients from OpenAPI descriptions — the TypeScript client
plus the `python`, `go`, and `php` SDKs, the generated CLI, and its Markdown reference.

- `src/intermediate-representation/` — the language-neutral API model every generator reads.
- `src/emitters/` — the renderers that turn that model into source text.
- `src/generators/` — one folder per generator: a thin entry plus the design skill it must match.
- `src/authoring/` — the language-neutral toolkit generators are written with, ours and users'.
