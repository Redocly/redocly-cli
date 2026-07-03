# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The contribution rules that apply to **every** AI tool live in @AGENTS.md — read those first. This file adds Claude Code-specific reference: the command list, the package layout, and the build system.

Claude Code also auto-loads the operating rules under `.claude/rules/` — the principles, code-quality standards, testing and QA procedures, security guidelines, the release workflow, and the Walker/Visitors/Nodes guide — plus the `/deslop` command.

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

The heart of the project. Handles all OpenAPI/AsyncAPI linting, validation, bundling, and decoration logic. This package is also used in external apps such as `language-server` and `vs-code-extension`.

Key directories:

- `src/rules/` — Built-in linting rules, organized by spec type (`oas2/`, `oas3/`, `oas3_1/`, `async2/`, `async3/`, `arazzo/`, `common/`). Each rule is its own file.
- `src/config/` — Configuration loading and resolution (reads `redocly.yaml`).
- `src/decorators/` — Built-in decorators for transforming API descriptions.
- `src/bundle/` — Bundling logic that resolves `$ref` across multiple files.
- `src/resolve.ts` — Document resolution for multi-file specs (local and remote).
- `src/types/` — TypeScript type definitions for OAS2, OAS3, AsyncAPI, Arazzo.

When you are creating new rule or fixing existing, you need to respect the basic patterns, provided in `.claude/rules/rules-system.md`.

### `packages/cli` (@redocly/cli)

User-facing CLI layer built on top of core. Uses yargs for argument parsing.

- `src/index.ts` — Main command dispatcher.
- `src/commands/` — One file per command: `lint`, `bundle`, `stats`, `split`, `join`, `build-docs`, `respect`, `auth`, `eject`, `preview-project`, `scorecard-classic`, `translations`, `generate-arazzo`.
- Commands use `commandWrapper()` for consistent output, config loading, config linting, and exit codes (0 = success, 1 = execution error, 2 = config error).

### `packages/respect-core` (@redocly/respect-core)

API contract testing framework. Validates real API responses against OpenAPI/Arazzo specs.

- `src/run.ts` — Test execution logic.
- `src/modules/` — Core testing modules, including runtime expression evaluation.

## Build System

`packages/core` and `packages/respect-core` are compiled by TypeScript (`tsc -b tsconfig.build.json`). `packages/cli` is bundled by **esbuild** (`packages/cli/scripts/build.mjs`) — it produces `lib/index.js` (entry chunk, ~450 kB) and lazy chunks under `lib/chunks/` (redoc + react, loaded only when `build-docs` runs). The root `npm run compile` runs both steps: tsc for core/respect-core, then the esbuild bundle for the CLI.

The published CLI package ships from a staged `.publish/` directory (created by `packages/cli/scripts/prepare-publish-dir.mjs`) with a hand-crafted `package.json` that has zero runtime dependencies — everything is bundled.
