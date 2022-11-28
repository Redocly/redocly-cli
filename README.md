# Redocly CLI toolset

Redocly CLI (fka OpenAPI CLI) toolbox with rich validation and bundling features.

![build and test](https://github.com/redocly/redocly-cli/actions/workflows/tests.yaml/badge.svg)
![npm (scoped)](https://img.shields.io/npm/v/@redocly/cli)
![NPM](https://img.shields.io/npm/l/@redocly/cli)

![OpenAPI 3 CLI toolset](./media/redocly-cli.gif)

## Features

Currently, @redocly/cli supports these features:

- [x] Multi-file validation. No need to bundle your file before validation.
- [x] Lightning-fast validation. Lint a 1 MB file in less than one second.
- [x] Built-in rules for common validations.
- [x] Configurable severity levels for each rule.
- [x] Human-readable error messages with codeframes and stylish format options.
- [x] Intuitive suggestions for misspelled types or references.
- [x] Easy to implement custom rules.
- [x] Bundle a multi-file definition into a single file.
- [x] Decorators to modify a validated definition during bundling.
- [x] Preview docs for local development.
- [x] Support for OpenAPI 2 (fka Swagger) and OpenAPI 3.0.
- [x] Basic support for OpenAPI 3.1

## What makes this tool different

- 💨 **It's faster** (uses a type tree similar to how linters for programming languages work)
- 🎯 **It's more accurate** (working with types is more accurate than working with JSON path)
- ⚙️ **It's highly configurable** (comes with a lot of commands and rules)
- 🛠️ **It's more extensible** (architected for custom plugins and types)

## Usage

### Node

```
npx @redocly/cli lint path-to-root-file.yaml
```

Alternatively, install it globally with `npm`:

```
npm install @redocly/cli -g
```

Then you can use it as `redocly [command] [options]`, for example:

```redocly lint path-to-root-file.yaml```

### Docker

To give the Docker container access to the OpenAPI definition files, you need to
mount the containing directory as a volume. Assuming the OAS definition is rooted
in the current working directory, you need the following command:

```
docker run --rm -v $PWD:/spec redocly/openapi-cli lint path-to-root-file.yaml
```

To build and run with a local image, run the following from the project root:

```
docker build -t redocly-cli .
docker run --rm -v $PWD:/spec redocly/cli lint path-to-root-file.yaml
```

## [Read the docs](https://redocly.com/docs/cli/)

## Credits

Thanks to [graphql-js](https://github.com/graphql/graphql-js) and [eslint](https://github.com/eslint/eslint) for inspiration of the definition traversal approach and to [Swagger](https://github.com/swagger-api/swagger-editor), [Spectral](https://github.com/stoplightio/spectral), and [OAS-Kit](https://github.com/Mermade/oas-kit) for inspiring the ruleset.

## Development

See [CONTRIBUTING.md](.github/CONTRIBUTING.md)
