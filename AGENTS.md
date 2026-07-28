# Contributing to Redocly CLI with AI assistants

AI-assisted contributions are welcome, but the bar is the same as for any other code: a change must be simple, readable, tested, and explainable by the person who opens the pull request.
This file tells an AI assistant — and its human — how to produce a change that fits Redocly CLI and survives review.

It is the single source of truth for AI tools, read from the repository root — directly or through a tool-specific pointer file.
The detailed operating rules live in [`.claude/rules/`](./.claude/rules), and the sections below link to them for the full depth.
For full development setup, the complete test command reference, and the release flow, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## How we work

- Write the simplest code that solves the problem and matches the surrounding file.
  Don't add wrappers, layers, or abstractions for something used in one place.
- Every PR is reviewed in details: code that can't be explained gets rejected.
  If you can't say why a line is there, remove it.
- Push back when something looks wrong.
  A good contribution argues for the better solution instead of agreeing with every instruction.
- Base changes on what the code and configuration actually do, not on assumptions.
  Read the relevant file before you change it.
- Use plain English in comments, commit messages, and PR descriptions — no filler and no marketing tone.
- For experimental features, follow the [experimental features checklist](./CONTRIBUTING.md#experimental-features) in the contributing guide.

The principles behind this, ordered by value, are in [`.claude/rules/core-principles.md`](./.claude/rules/core-principles.md).

## Commands

```bash
# Install dependencies
npm install

# Compile TypeScript (required before running tests)
npm run compile

# Type checking only (no emit)
npm run typecheck

# Run all unit tests
npm run unit

# Run a single test file
npm run unit -- packages/core/src/__tests__/some.test.ts

# Run tests matching a name pattern
npm run unit -- -t 'test name pattern'

# Update snapshots
npm run unit -- -u

# Run e2e tests
npm run e2e

# Run the full test suite (compile + typecheck + unit + e2e)
npm test

# Lint
npm run lint

# Format
npm run format

# Run the CLI directly from source
npm run cli -- lint openapi.yaml
```

## Architecture

This is a TypeScript monorepo with npm workspaces containing three packages:

### `packages/core` (@redocly/openapi-core)

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

### `packages/cli` (@redocly/cli)

User-facing CLI layer built on top of core.
Uses yargs for argument parsing.

- `src/index.ts` — Main command dispatcher.
- `src/commands/` — One file per command.
- Commands use `commandWrapper()` for consistent output, config loading, config linting, and exit codes (0 = success, 1 = execution error, 2 = config error).

### `packages/respect-core` (@redocly/respect-core)

API contract testing framework.
Validates real API responses against OpenAPI/Arazzo specs.

- `src/run.ts` — Test execution logic.
- `src/modules/` — Core testing modules, including runtime expression evaluation.

## Build System

`packages/core` and `packages/respect-core` are compiled by TypeScript (`tsc -b tsconfig.build.json`).
`packages/cli` is bundled by esbuild (`packages/cli/scripts/build.mjs`) — it produces `lib/index.js` (entry chunk, ~450 kB) and lazy chunks under `lib/chunks/` (redoc + react, loaded only when `build-docs` runs).
The root `npm run compile` runs both steps: tsc for core/respect-core, then the esbuild bundle for the CLI.

The published CLI package ships from a staged `.publish/` directory (created by `packages/cli/scripts/prepare-publish-dir.mjs`) with a hand-crafted `package.json` that has zero runtime dependencies — everything is bundled.

## Respect the architecture: Walker, Visitors, Nodes

Linting in `packages/core` rests on three concepts: the **Walker** traverses the parsed API description and resolves `$ref`s, **Visitors** are objects keyed by **Node** type, and the Walker calls each visitor's `enter` / `leave` / `skip` hooks as it reaches a node.
New rules and decorators follow this pattern instead of parsing documents by hand.
The full guide, with examples, is in [`.claude/rules/rules-system.md`](./.claude/rules/rules-system.md).

## Add or change a built-in rule

A rule is not finished when its logic works.
To avoid a half-wired rule, a new rule must also be:

- Registered in the spec index (for example `packages/core/src/rules/oas3/index.ts`).
- Added to the `minimal`, `recommended`, `recommended-strict`, `spec`, and `all` rulesets with sensible severities — the defaults are `off` or `warn` for `minimal` and `recommended`, and `error` for `all`.
- Added to the built-in rules list in `packages/core/src/types/redocly-yaml.ts`.
- Documented: a new page under `docs/@v2/`, a link from the built-in rules list and the sidebar, plus updates to the rulesets and ruleset-templates pages.

Naming and reuse:

- If the rule enforces a specification requirement, prefix its name with `spec-` and add it to the spec ruleset in `packages/core/src/config/spec.ts`.
- If the same concept already exists for another spec flavor, reuse that rule name so it stays discoverable across specs.
- Prefer real rule code over assertion-based (`redocly.yaml`) rules when contributing to the core rule set.

## Testing

- **Compile before testing.** Unit tests import from `lib/` (compiled output), not `src/` — run `npm run compile` after every change.
- Cover the feature or fix with one focused test, not a pile of redundant ones.
  A single clear test that exercises the behavior is enough.
- Rule unit tests parse a YAML document, run `lintDocument`, and assert with `toMatchInlineSnapshot` so the whole output stays visible.
  Generate or update snapshots as part of the change.
- Don't add `console.log` or write to `stdout` / `stderr` directly — it breaks the e2e snapshots.
  Use the `logger` from `@redocly/openapi-core` (see [`CONTRIBUTING.md`](./CONTRIBUTING.md#logging)).
- A `redocly.yaml` in the repository root affects unit tests in the CLI package.
  Remove it before running them.
- Run the full suite (`npm test`) when you touch core linting logic.

The full testing and QA rules are in
[`.claude/rules/testing.md`](./.claude/rules/testing.md).

The rule test pattern looks like this:

```ts
import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import { BaseResolver } from '../../../resolve.js';

describe('Oas3 no-my-rule', () => {
  it('should report a violation', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        ...
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'no-my-rule': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`...`);
  });
});
```

## Code quality — no AI slop

Before opening a PR, strip the things an assistant tends to add that a human reviewer would not:

- Comments that restate the code or don't match the file's existing comment density.
- Defensive `try/catch` or null checks in trusted, already-validated code paths.
- Casts to `any` to silence the type checker — fix the type instead.
- Helpers or wrappers used in only one place.
- Single-letter or abbreviated names (`m`, `p`, `e`).
  Use descriptive names like `pkgRootMatch`, `inputPath`, `error`.
  This applies across every package and script.

The full list of practices this repo enforces is in [`.claude/rules/code-quality-standards.md`](./.claude/rules/code-quality-standards.md).

## Documentation and user-facing output

- Update the docs for every new or changed rule, decorator, option, or command — a feature without docs is incomplete.
- Keep user-facing output (CLI messages, warnings, errors) clear, non-technical, and actionable.
- Don't create explanation, summary, or design files unless asked.
  Put the explanation in the PR description.

The full documentation and output rules are in [`.claude/rules/documentation.md`](./.claude/rules/documentation.md).

## Changesets and commits

The full release and commit workflow is in [`.claude/rules/workflow.md`](./.claude/rules/workflow.md).

- Every feature or fix needs a changeset: run `npx changeset` and describe the change in sentence case.
  If the change lives in `packages/core` or `packages/respect-core` but affects CLI behavior, include `@redocly/cli` as well.
  All three packages share one version and release together.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
- Don't add AI co-author or "Generated by" lines to commits.
- Don't modify the pull request template.
- Let the contributor review and make the commit — don't commit automatically.

## Security basics

The full security guidelines are in [`.claude/rules/security-guidelines.md`](./.claude/rules/security-guidelines.md).

- Never hardcode credentials, tokens, or secrets.
- Validate and type-check external input (configuration, CLI arguments, fetched documents) before using it.
- Don't use `eval` or build shell commands from unsanitised input.
