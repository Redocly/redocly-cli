# Redocly CLI Contributing Guide

Hi! We're really excited that you are interested in contributing to Redocly CLI. Before submitting your contribution though, please make sure to take a moment and read through the following guidelines.

- [Issue reporting guidelines](#issue-reporting-guidelines)
- [Pull request guidelines](#pull-request-guidelines)
- [Development setup](#development-setup)
- [Local source code usage](#local-source-code-usage)
- [Contribute documentation](#contribute-documentation)
- [Built-in rules changes](#built-in-rules-changes)
- [Arguments usage](#arguments-usage)
- [Exit codes](#exit-codes)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Release flow](#release-flow)

## Issue reporting guidelines

- Before opening a new issue, try to make sure the same problem or idea hasn't already been reported. You can do that on the [Issues page](https://github.com/Redocly/redocly-cli/issues) in the repository and using the filter `is:issue` combined with some keywords relevant to your idea or problem. It helps us notice that more people have the same issue or use-case, and reduces the chance of getting your issue marked as a duplicate. Plus, you can even find some workarounds for your issue in the comments of a previously reported one!

- The best way to get your bug fixed is to provide a (reduced) test case. This means listing and explaining the steps we should take to try and hit the same problem you're having. It helps us understand in which conditions the issue appears, and gives us a better idea of what may be causing it.

- Abide by our [Code of Conduct](https://redocly.com/code-of-conduct/) in all your interactions on this repository, and show patience and respect to other community members.

## Pull request guidelines

Before submitting a pull request, please make sure the following is done:

1. Fork the repository and create your branch from `main`.
1. Run `npm install` in the repository root.
1. If you’ve fixed a bug or added code that should be tested, don't forget to add [tests](#tests)!
1. Ensure the test suite passes (see the [Tests section](#tests) for more details).
1. Format your code with prettier (`npm run prettier`).
1. Each feat/fix PR should also contain a changeset (to create one, run `npx changeset`; if your changes are scoped to `packages/core` but also affect Redocly CLI behavior, please include the `@redocly/cli` package as well). Please describe what you've done in this PR using sentence case (you can refer to our [changelog](https://redocly.com/docs/cli/changelog/)). This produces a file in `.changeset` folder. Please commit this file along with your changes. If the PR doesn't need a changeset (for example, it is a small change, or updates only documentation), add the 'No Changeset Needed' label to the PR.

## Development setup

[Node.js](http://nodejs.org) at v14.19.0+ and NPM v7.0.0+ are required.

After forking the repo, run:

```bash
npm install # or npm i
```

### Commonly used NPM scripts

To compile the code, run `npm run compile`. To do that on the fly, run `npm run watch` in a separate thread.

To run a specific CLI command, use `npm run cli`, e.g. `npm run cli -- lint resources/museum.yaml --format=stylish`. Please notice that the extra `--` is required to pass arguments to the CLI rather than the NPM itself.

Format your code with `npm run prettier` before committing.

Please check the [Tests section](#tests) for the test commands reference.

There are some other scripts available in the `scripts` section of the `package.json` file.

## Local source code usage

### NPM linking

To test the local source code of the packages in other local applications, you can use npm linking. See the [docs](https://docs.npmjs.com/cli/v9/commands/npm-link).

### Local packing and installing

To test local changes as a package, you can use the following steps:

1. Optionally, bump the version of the packages ([see details](#version-updating)).

1. Run `npm run pack:prepare` in the repository's root. This generates **redocly-cli.tgz** and **openapi-core.tgz** files and makes some changes to **packages/cli/package.json** file.

1. Copy **redocly-cli.tgz** file to a destination folder and then run `npm install redocly-cli.tgz` there to install Redocly CLI. To install `openapi-core` do the same but with **openapi-core.tgz** file.

Don't forget to revert the changes to **package.json** files later.

## Contribute documentation

Additions and updates to our documentation are very welcome. You can find the documentation in the `docs/` folder, and this is published to https://redocly.com/docs/cli/ as part of our main website.

To preview your changes locally, run this command from the `docs/` folder:

```bash
https://redocly.com/docs/cli/
```

> Please note that currently the custom markdoc tags used in the main website are not available in the local preview version, and links that point to the wider website do show as errors when using a local platform. The pull request workflows generate a full preview, so rest assured that you are able to check everything is in good shape before we review and merge your changes.

### Prose linting

We are proud of our docs. When you open a pull request, we lint the prose using [Vale](https://vale.sh/). You can also install this tool locally and run it from the root of the project with:

```bash
vale docs/
```

The configuration is in `.vale.ini` in the root of the project.

### Markdown linting

We use [Markdownlint](https://github.com/DavidAnson/markdownlint) to check that the Markdown in our docs is well formatted. The checks run as part of the pull request, and you can also run this tool locally. Follow the instructions from the markdownlint project page, and then run `markdownlint docs/` in the top-level folder of this repository.

> Note that prettier also runs and reformats Markdown files. Use `npm run prettier` from the root of the project.

### Markdown link checking

We use [`mlc`](https://github.com/becheran/mlc) to check the links in the `docs/` folder. This tool runs automatically on every pull request, but you can also run it locally if you want to. Visit the project homepage to find the installation instructions for your platform, and then run the command like this:

```bash
mlc docs/
```

It only checks links within the local docs (it can't check links to other docs sections that are present when we publish all products under https://redocly.com/docs), and doesn't currently check anchors, so take care when renaming pages or titles.

## Built-in rules changes

After adding a new rule, make sure it is added to the `minimal`, `recommended` and `all` rulesets with appropriate severity levels. The defaults are `off` for `minimal` and `recommended` and `error` for `all`.
Also add the rule to the `builtInRulesList` in [the config types tree](../packages/core/src/types/redocly-yaml.ts).

Separately, open a merge request with the corresponding documentation changes.

## Arguments usage

There are three ways of providing arguments to the CLI: environment variables, command line arguments, and Redocly configuration file.

### Environment variables

Environment variables should be used to provide some arguments that are common for all the commands.
We always prefer configuration over environment variables.
Environment variables should not affect the **core** package logic.

### Command line arguments

Use them to provide some arguments that are specific to a certain command. Think of them as modifiers. They should not affect the **core** package logic.

### Configuration file

The **redocly.yaml** file is the most flexible way of providing arguments. Please use it to provide arguments that are common for all the commands, for a specific command, or for a specific API. It could be used for providing arguments for both **cli** and **core** packages. Please refer to the [configuration file](https://redocly.com/docs/cli/configuration/) documentation for more details.

## Exit codes

The application maintains the following exit codes.

| Exit code | Description              |
| --------- | ------------------------ |
| 0         | Success                  |
| 1         | Command execution error  |
| 2         | Config resolving failure |

## Tests

### Unit tests

Run unit tests with this command: `npm run test`.

Unit tests in the **cli** package are sensitive to top-level configuration file (**redocly.yaml**).

To run a specific test, use this command: `npm run unit -- -t 'Test name'`.
To update snapshots, run `npm run unit -- -u`.

To get coverage per package run `npm run coverage:cli` or `npm run coverage:core`.

### E2E tests

Run e2e tests with this command: `npm run e2e`.

E2E tests are sensitive to any additional output (like `console.log`) in the source code.

To update snapshots, run `npm run e2e -- -u`.

If you made any changes, make sure to compile the code before running the tests.

## Project structure

- **`__mocks__`**: contains basic mocks for e2e tests.

- **`__tests__`**: contains e2e tests. The e2e tests are written and run with [Jest](https://jestjs.io/).

- **`docs`**: contains the documentation source files. When changes to the documentation are merged, they automatically get published on the [Redocly docs website](https://redoc.ly/docs/cli/).

- **`packages`**: contains the source code. Сonsists of two packages - CLI and core. The codebase is written in Typescript.

  - **`packages/cli`**: contains Redocly CLI commands and utils. More details [here](../packages/cli/README.md).

    - **`packages/cli/src`**: contains CLI package source code.

      - **`packages/cli/src/__mocks__`**: contains basic mocks for unit tests.
      - **`packages/cli/src/__tests__`**: contains unit tests.
      - **`packages/cli/src/commands`**: contains CLI commands functions.

  - **`packages/core`**: contains Redocly CLI core functionality like rules, decorators, etc.

    - **`packages/core/__tests__`**: contains unit tests.
    - **`packages/cli/core`**: contains core package source code.

      - **`packages/core/src/__tests__`**: contains unit tests.
      - **`packages/core/src/benchmark`**: contains basic perf benchmark. Not fully ready yet.
      - **`packages/core/src/config`**: contains the base configuration options.
      - **`packages/core/src/decorators`**: contains the built-in [decorators](../docs/resources/built-in-decorators.md) code.
      - **`packages/core/src/format`**: contains the format options.
      - **`packages/core/src/js-yaml`**: contains the [JS-YAML](https://www.npmjs.com/package/js-yaml) based functions.
      - **`packages/core/src/redocly`**: contains the Redocly API registry integration setup.
      - **`packages/core/src/rules`**: contains the built-in [rules](../docs/resources/built-in-rules.md) code.
      - **`packages/core/src/types`**: contains the common types for several OpenAPI versions.
      - **`packages/core/src/typings`**: contains the common Typescript typings.

- **`resources`**: contains some example API descriptions and configuration files that might be useful for testing.

## Release flow

We use [Changesets](https://github.com/changesets/changesets) flow.
After merging a PR with a changeset, the release PR is automatically created.

If the pipelines are not starting, close and reopen the PR. Merging that PR triggers the release process.
