# OpenAPI CLI Contributing Guide

Hi! We're really excited that you are interested in contributing to OpenAPI CLI. Before submitting your contribution though, please make sure to take a moment and read through the following guidelines.

- [OpenAPI CLI Contributing Guide](#openapi-cli-contributing-guide)
  - [Issue Reporting Guidelines](#issue-reporting-guidelines)
  - [Pull Request Guidelines](#pull-request-guidelines)
  - [Development Setup](#development-setup)
    - [Commonly used NPM scripts](#commonly-used-npm-scripts)
  - [Project Structure](#project-structure)

## Issue Reporting Guidelines

- Before opening a new issue, try to make sure the same problem or idea hasn't already been reported. You can do that by going to the [Issues page](https://github.com/Redocly/openapi-cli/issues) in the repository and using the filter `is:issue` combined with some keywords relevant to your idea or problem. It helps us notice that more people have the same issue or use-case, and reduces the chance of getting your issue marked as a duplicate. Plus, you can even find some workarounds for your issue in the comments of a previously reported one!
  
- The best way to get your bug fixed is to provide a (reduced) test case. This means listing and explaining the steps we should take to try and hit the same problem you're having. It helps us understand in which conditions the issue appears, and gives us a better idea of what may be causing it.

- Abide by our [Code of Conduct](https://redoc.ly/code-of-conduct/) in all your interactions on this repository, and show patience and respect to other community members.

## Pull Request Guidelines
Before submitting a pull request, please make sure the following is done:

1. Fork the repository and create your branch from master.
2. Run `npm install` in the repository root.
3. If you’ve fixed a bug or added code that should be tested, don't forget to add tests!
4. Ensure the test suite passes (`npm test`). Tip: `npm test -- --watch TestName` is helpful in development.
5. Format your code with prettier (`npm run prettier`).

## Development Setup

You will need [Node.js](http://nodejs.org) at `v15.0.0+`.

After forking the repo, run:  

```bash
$ npm install # or npm i
```

### Commonly used NPM scripts

``` bash
# run a separate CLI command
$ npm run <command>

# run a compile of packages
$ npm run compile

# synchronously pick-up the changes made to the packages
$ npm run watch

# run the CLI package
$ npm run cli

# run the unit tests with typecheck
$ npm test

# run the unit tests (includes coverage report)
$ npm run unit

# run e2e tests
$ npm run e2e
# Make sure you have compiled the code before running e2e test
# E.g. run `npm run compile` and wait for the finishing process or run `npm run watch`.

# format the code using prettier
$ npm run prettier

# run basic perf benchmark
$ npm run benchmark
```

There are some other scripts available in the `scripts` section of the `package.json` file.

## Project Structure

- **`__mocks__`**: contains basic mocks for e2e tests.
  
- **`__tests__`**: contains e2e tests. The e2e tests are written and run with [Jest](https://jestjs.io/).

- **`docs`**: contains the documentation source files. When changes to the documentation are merged, they automatically get published on the [Redocly docs website](https://redoc.ly/docs/cli/).

- **`packages`**: contains the source code. Сonsists of two packages - CLI and core. The codebase is written in Typescript.

  - **`packages/cli`**: contains OpenAPI CLI commands and utils. More details [here](../packages/cli/README.md).
  
    - **`packages/cli/src`**: contains CLI package source code.
  
      - **`packages/cli/src/__mocks__`**: contains basic mocks for unit tests.
      - **`packages/cli/src/__tests__`**: contains unit tests.
      - **`packages/cli/src/commands`**: contains CLI commands functions.
  
  - **`packages/core`**: contains OpenAPI CLI core functionality like rules, decorators, etc.

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

- **`resources`**: contains some example API definitions and configuration files that might be useful for testing.
