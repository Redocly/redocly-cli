# Redocly CLI Contributing Guide

Hi! We're really excited that you are interested in contributing to Redocly CLI.
Before submitting your contribution though, please make sure to take a moment and read through the following guidelines.

- [Issue reporting guidelines](#issue-reporting-guidelines)
- [Pull request guidelines](#pull-request-guidelines)
- [Development setup](#development-setup)
- [Development guidelines](#development-guidelines)
- [Local source code usage](#local-source-code-usage)
- [Contribute documentation](#contribute-documentation)
- [Built-in rules changes](#built-in-rules-changes)
- [Arguments usage](#arguments-usage)
- [Exit codes](#exit-codes)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Release flow](#release-flow)

## Issue reporting guidelines

- Before opening a new issue, try to make sure the same problem or idea hasn't already been reported.
  You can do that on the [Issues page](https://github.com/Redocly/redocly-cli/issues) in the repository and using the filter `is:issue` combined with some keywords relevant to your idea or problem.
  It helps us notice that more people have the same issue or use case, and reduces the chance of getting your issue marked as a duplicate.
  Plus, you can even find some workarounds for your issue in the comments of a previously reported one!

- The best way to get your bug fixed is to provide a (reduced) test case.
  This means listing and explaining the steps we should take to try and hit the same problem you're having.
  It helps us understand in which conditions the issue appears, and gives us a better idea of what may be causing it.

- Abide by our [Code of Conduct](https://redocly.com/code-of-conduct/) in all your interactions on this repository, and show patience and respect to other community members.

## Pull request guidelines

Before submitting a pull request, please make sure the following is done:

1. Pull/fork the repository and create your branch from `main`.
1. Run `npm install` in the repository root.
1. If you've fixed a bug or added code that should be tested, don't forget to add [tests](#tests)!
1. Ensure the test suite and lint checks pass (`npm run test` and `npm run lint`).
1. It's your responsibility to ensure your contribution does not violate copyright laws.
1. Each feat/fix PR should also contain a changeset (to create one, run `npx changeset`).
   If your changes are scoped to `packages/core` or `packages/respect-core` but also affect Redocly CLI behavior, include the `@redocly/cli` package as well.
   Describe what you've done in this PR using sentence case (you can refer to our [changelog](https://redocly.com/docs/cli/changelog/)).
   This creates a file in the `.changeset` folder.
   Commit this file with your changes.
   If the PR doesn't need a changeset (for example, it is a small change, or updates only documentation), add the `no changeset needed` label to the PR.
1. Use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format for commit messages.

**Please do not modify the PR template.**

**Maintainers (when merging):** remove redundant intermediate commit descriptions and keep the main commit description (plus co-authors if needed).
If several commit descriptions should be preserved, rebase instead of squashing.

## Development setup

[Node.js](http://nodejs.org) at v22.12.0+ and NPM v11+ are required.

After forking the repo, run:

```bash
npm install # or npm i
```

### Commonly used NPM scripts

To compile the code, run `npm run compile`.

To run a specific CLI command, use `npm run cli`, e.g. `npm run cli -- lint resources/museum.yaml --format=stylish`.
Please notice that the extra `--` is required to pass arguments to the CLI rather than to NPM itself.

Format your code with `npm run format` before committing.

Please check the [Tests section](#tests) for the test commands reference.

There are some other scripts available in the `scripts` section of the `package.json` file.

## Development guidelines

### Logging

When contributing to Redocly CLI, it's important to follow these logging guidelines:

1. Use the built-in logger from `@redocly/openapi-core` package:

   ```typescript
   import { logger } from '@redocly/openapi-core';
   ```

2. All informational messages, warnings, and errors should be written to `stderr` using the appropriate logger methods:
   - `logger.info()` for general information
   - `logger.warn()` for warnings
   - `logger.error()` for errors

3. Only write to `stdout` when the output is meant to be consumed by other applications or tools (like when piping to `jq` or other CLI tools). This includes:
   - Command output that needs to be parsed
   - Interactive outputs (like login/logout responses)
   - Data that needs to be piped to other commands

   ```typescript
   logger.output(JSON.stringify(stats, null, 2));
   ```

4. Avoid using `console.log`, `console.error`, or direct `process.stdout.write`/`process.stderr.write` calls.
   Always use the logger methods to ensure consistent output formatting and proper stream usage.

## Local source code usage

There are two options for testing local changes in other local applications: NPM linking and local packing and installing from the `redocly-cli.tgz` file.

### NPM linking

To test the local source code of the packages in other local applications, you can use npm linking. See the [docs](https://docs.npmjs.com/cli/v9/commands/npm-link).

### Local packing and installing

To test local changes as a package, you can use the following steps:

1. Optionally, change the version of the packages.

1. Run `npm run pack:prepare` in the repository's root.
   This generates **redocly-cli.tgz**, **respect-core.tgz**, and **openapi-core.tgz** files.

1. Copy those **.tgz** files to a destination folder and then run `npm install redocly-cli.tgz` there to install Redocly CLI.
   To install `openapi-core` do the same but with **openapi-core.tgz** file.

## Contribute documentation

Additions and updates to our documentation are very welcome.
You can find the documentation in the `docs/` folder, and this is published to https://redocly.com/docs/cli/ as part of our main website.

To preview your documentation changes locally:

1. Make sure `redocly` is already installed on your local computer. See [installation](https://redocly.com/docs/cli/installation/).

2. Run this command from the `docs/` folder:

```bash
redocly preview
```

By default, you can access the docs preview at http://localhost:4000 or http://127.0.0.1:4000.

> Please note that currently the custom markdoc tags used in the main website are not available in the local preview version, and links that point to the wider website do show as errors when using a local platform.
> The pull request workflows generate a full preview, so rest assured that you are able to check everything is in good shape before we review and merge your changes.

### Prose linting

We are proud of our docs.
When you open a pull request, we lint the prose using [Vale](https://vale.sh/).
You can also install this tool locally and run it from the root of the project with:

```bash
vale README.md docs/ .changeset
```

The configuration is in `.vale.ini` in the root of the project.

### Markdown linting

We use [Markdownlint](https://github.com/DavidAnson/markdownlint-cli2) to check that the Markdown in our docs is well formatted (config: `.markdownlint.yaml`).
The checks run on pull requests; locally, from the repository root:

```bash
npx markdownlint-cli2 "docs/**/*.md"
```

> Note that formatter also runs and reformats Markdown files. Use `npm run format` from the root of the project.

### Markdown link checking

We use [`mlc`](https://github.com/becheran/mlc) to check the links in the `docs/` folder.
This tool runs automatically on every pull request, but you can also run it locally if you want to.
Visit the project homepage to find the installation instructions for your platform, and then run the command like this:

```bash
mlc docs/
```

It only checks links within the local docs (it can't check links to other docs sections that are present when we publish all products under https://redocly.com/docs), and doesn't currently check anchors, so take care when renaming pages or titles.

## Built-in rules changes

After adding a new rule, make sure it is added to the `minimal`, `recommended`, `recommended-strict` (the same as the previous but with warnings turned into error), `spec`, and `all` rulesets with appropriate severity levels.
The defaults are `off` or `warn` for `minimal` and `recommended` and `error` for `all`.
Also add the rule to the built-in rules list in [the config types tree](./packages/core/src/types/redocly-yaml.ts).

If the rule reflects a specification requirement, prefix it with `spec-` and add it to the [spec ruleset](./packages/core/src/config/spec.ts).
If a rule already exists for another specification flavor, reuse the existing name so the same concept stays discoverable across specs.

Separately, open a pull request with the corresponding documentation changes.
To make changes to documentation:

1. Create a new page for the rule in the `docs/@v2` folder.
2. Add the link to the rule page to the [built-in rules list](docs/@v2/rules/built-in-rules.md) and the [sidebar](docs/@v2/v2.sidebars.yaml).
3. Update the rulesets pages and [ruleset templates](docs/@v2/rules/ruleset-templates.md).

## Arguments usage

There are three ways of providing arguments to the CLI: environment variables, command line arguments, and a Redocly configuration file.

### Environment variables

Environment variables should be used to provide some arguments that are common for all the commands.
We always prefer configuration over environment variables.
Environment variables should not affect the **core** package logic.

### Command line arguments

Use them to provide some arguments that are specific to a certain command.
Think of them as modifiers.
They should not affect the **core** package logic.

### Configuration file

The **redocly.yaml** file is the most flexible way of providing arguments.
Please use it to provide arguments that are common for all the commands, for a specific command, or for a specific API.
It could be used for providing arguments for both **cli** and **core** packages.
Please refer to the [configuration file](https://redocly.com/docs/cli/configuration/) documentation for more details.

## Exit codes

The application maintains the following exit codes.

| Exit code | Description               |
| --------- | ------------------------- |
| 0         | Success                   |
| 1         | Command execution error   |
| 2         | Config resolution failure |

## Tests

When running tests, make sure the code is compiled (`npm run compile`).
Having `redocly.yaml` in the root of the project affects the unit tests, and console logs affect the e2e tests, so make sure to get rid of both before running tests.
Run `npm test` to start both unit and e2e tests (and additionally typecheck the code).

### Monorepo test conventions

This is a monorepo with NPM workspaces.
All tests share a single Vitest installation and a single configuration file at the repository root.
Do not add a per-package `vitest.config.ts`, a per-package `test` script, or per-package `vitest` / `@vitest/*` dependencies — they will be ignored or conflict with the root setup.

The root configuration is in [`vitest.config.ts`](./vitest.config.ts) and defines:

- The `unit` suite, which discovers tests via the glob `packages/*/src/**/*.test.ts`.
- The `e2e` suite, which discovers tests under `tests/e2e/**`.
- Coverage (Istanbul provider) collected for packages enumerated in `coverage.include`.
- Repo-wide minimum coverage thresholds, plus optional per-glob overrides for packages that want stricter limits.

Vitest globals (`describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`, …) are enabled and the TypeScript types for them are provided through [`tsconfig.json`](./tsconfig.json)'s `"types": ["vitest/globals", "node"]`.
Do **not** add `import { describe, it, expect } from 'vitest'` to test files — these names are already in scope.

### Where tests live

Tests live next to the source they cover, inside a sibling `__tests__/` folder, and use the `.test.ts` suffix:

```text
packages/<your-package>/
  src/
    feature.ts
    __tests__/
      feature.test.ts        ← unit tests
    submodule/
      thing.ts
      __tests__/
        thing.test.ts
```

The root config picks up the test files automatically.
There is no need to add additional wiring for **discovery**.

### Adding tests for a new package

When introducing a new package under `packages/`, plug it into the existing test infrastructure:

1. Author tests under `packages/<your-package>/src/**/__tests__/*.test.ts`.
    Use the Vitest globals — no imports from `'vitest'`.
2. Open the root [`vitest.config.ts`](./vitest.config.ts) and append your package's source glob to `coverage.include`, for example:

   ```typescript
   include: [
     'packages/cli/src/**/*.ts',
     'packages/core/src/**/*.ts',
     'packages/respect-core/src/**/*.ts',
     'packages/<your-package>/src/**/*.ts',
   ],
   ```

3. If your package contains pure type-definition modules (files that compile to empty `.js` like `types.ts` or `model.ts`), add them to `coverage.exclude` so they don't dilute the coverage signal.
4. (Optional) Enforce stricter per-file coverage for your package using a per-glob threshold alongside the repo-wide minimums:

   ```typescript
   thresholds: {
     lines: 80,
     functions: 83,
     statements: 80,
     branches: 72,
     'packages/<your-package>/src/**/*.ts': {
       lines: 100,
       functions: 100,
       statements: 100,
       branches: 100,
     },
   },
   ```

5. Do not declare `vitest` or `@vitest/coverage-istanbul` in the new package's `package.json`.
    These are workspace-wide dev dependencies, installed once at the root.

### Unit tests

Run unit tests with this command: `npm run unit`.
This command runs the suite for every package whose tests match the discovery glob — there is no per-package `npm test` script.

Unit tests in the **cli** package are sensitive to top-level configuration file (**redocly.yaml**).

To run tests from a single file, run: `npm run unit -- <path/to/your/file.test.ts>`.
To run a specific test, use this command: `npm run unit -- -t 'Test name'`.
To update snapshots, run `npm run unit -- -u`.
To skip coverage, run it with `--coverage=false`.

Run `npm run unit` with coverage reporting always enabled (the `coverage` block in the root config sets `enabled: true`); the HTML report is written to `coverage/`.

### E2E tests

Run e2e tests with this command: `npm run e2e`.

E2E tests are sensitive to any additional output (like `console.log`) in the source code.

To update snapshots, run `npm run e2e -- -u`.
This command includes the file-based snapshots used by some tests via `toMatchFileSnapshot`.
For example, `tests/e2e/generate-client/cafe.snapshot.ts` is the committed full-file output of the TypeScript client generator.
Always review snapshot diffs in the pull request to confirm the change is intentional.

If you made any changes, make sure to compile the code before running the tests.

The e2e tests are written and run with [Vitest](https://vitest.dev/).
They live under `tests/e2e/`, grouped by command.

Note that the snapshot does not always match the command output because of the way stdout and stderr are combined in [`getCommandOutput`](./tests/e2e/helpers.ts).
This is intentional so outputs stay consistent for snapshot testing.
The order of stdout and stderr in a snapshot may differ from what you see in the terminal, but the combined output is stable.

### Smoke tests

Smokes are for testing the CLI in different environments.

To run them locally, please follow the steps described in the smoke GitHub actions: [smoke-basic](.github/workflows/smoke.yaml), [smoke-plugins](.github/workflows/smoke-plugins.yaml), [smoke-rebilly](.github/workflows/smoke-rebilly.yaml).

To update smoke tests for the `build-docs` command (which sometimes fails due to external package updates), please follow the steps below:

```sh
# Build and install the current CLI build locally
npm run compile
npm run pack:prepare
npm i -g redocly-cli.tgz

# Re-build the docs
(cd tests/smoke/basic/ && redocly build-docs openapi.yaml -o pre-built/redoc.html)
```

Don't forget to visually check the [changes](tests/smoke/basic/pre-built/redoc.html) in a browser.
For other commands you'd have to do something similar.

### Performance benchmark

To run the performance tests locally, you should have `hyperfine` (v1.16.1+) installed on your machine.
Prepare the local build, go to the `tests/performance` folder, clean it up, do the preparations:

```sh
(npm run compile && npm run pack:prepare && cd tests/performance/ && git clean -dX -f . && git clean -dX -ff .  && rm -rf node_modules && rm -f package-lock.json && npm i && npm run make-test)
```

and run the actual test:

```sh
(cd tests/performance/ && npm run test)
```

You might need to adjust the CLI versions that need to be tested in the `tests/performance/package.json` file.
There are also other commands available for your convenience to test specific commands like `lint` or `check-config`.

### Manual tests

What should be verified when changes are applied to the `respect-core` package:

- `mTLS` is working. Can be done by calling API endpoint with mTLS authentication `npm run cli respect {YOUR}.arazzo.yaml -- --verbose --mtls=='{"domain":{"caCert":"ca-cert.pem", "clientKey":"client-key.pem","clientCert":"client-cert.pem"}}'`. [Learn more about mTLS usage in Respect](https://redocly.com/docs/respect/guides/mtls-cli#use-mtls-with-respect-in-redocly-cli).
- File upload is working for both `multipart/form-data` and `application/octet-stream`.

## Project structure

- **`tests/e2e`**: contains e2e tests.

- **`tests/performance`**: contains the performance benchmark.

- **`tests/smoke`**: contains smoke tests.

- **`docs`**: contains the documentation source files. When changes to the documentation are merged, they automatically get published on the [Redocly docs website](https://redocly.com/docs/cli/).

- **`packages`**: contains the source code. It consists of three packages - CLI, core, and respect-core. The codebase is written in Typescript.
  - **`packages/cli`**: contains Redocly CLI commands and utils. More details [here](./README.md).
    - **`packages/cli/src`**: contains CLI package source code.
      - **`packages/cli/src/commands`**: contains CLI commands functions.

  - **`packages/core`**: contains Redocly CLI core functionality like rules, decorators, etc.
    - **`packages/core/src`**: contains core package source code.
      - **`packages/core/src/config`**: contains the base configuration options.
      - **`packages/core/src/decorators`**: contains the built-in [decorators](docs/@v2/decorators.md) code.
      - **`packages/core/src/format`**: contains the format options.
      - **`packages/core/src/js-yaml`**: contains the [JS-YAML](https://www.npmjs.com/package/js-yaml) based functions.
      - **`packages/core/src/rules`**: contains the built-in [rules](docs/@v2/rules/built-in-rules.md) code.
      - **`packages/core/src/types`**: contains the common types for several OpenAPI versions.
      - **`packages/core/src/typings`**: contains the common Typescript typings.

  - **`packages/respect-core`**: contains the Respect core package.

- **`resources`**: contains some example API descriptions and configuration files that might be useful for testing.

## Release flow

We use [Changesets](https://github.com/changesets/changesets) flow.
After merging a PR with a changeset, the release PR is automatically created.

If the pipelines are not starting, close and reopen the PR.
Merging that PR triggers the release process.

### Revert a release

There's no possibility to revert a release itself.
However, you can release a new version with a problematic commit reverted.
Create a new branch from **main**, then find the hash of the commit you want to revert and run `git revert <commit-hash>`.
Create a patch-level changeset for the revert and open a PR with it.
Merge the PR and cut a release according to the [Release flow](#release-flow).

### Snapshot release

To release an experimental version to the **NPM** registry, follow these steps:

1. Create a new PR to **main**.
2. Add the `snapshot` label to the PR.
   This triggers a release of the current branch changes to the **NPM** registry under the `snapshot` tag.

The released version can be installed with `npm install @redocly/cli@snapshot`.

### Release a V1 version

Redocly CLI v1 is currently in archive mode, but still can receive bug fixes.

To release a new version, switch to the `v1` branch and follow the steps described in the Contribution guide (the `CONTRIBUTING.md` file).
