# Redocly CLI

Command-line utility from [@Redocly](https://redocly.com) with OpenAPI superpowers. Build, manage and quality-check OpenAPI descriptions, configure and execute API governance, and publish beautiful API documentation. Supports OpenAPI 3.1, 3.0 and OpenAPI 2.0 (legacy Swagger format).

![build and test](https://github.com/redocly/redocly-cli/actions/workflows/tests.yaml/badge.svg)
![npm (scoped)](https://img.shields.io/npm/v/@redocly/cli)
![NPM](https://img.shields.io/npm/l/@redocly/cli)

![OpenAPI 3 CLI toolset](./media/redocly-cli.gif)

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

```
redocly lint path-to-root-file.yaml
```

Minimal required versions of Node.js and NPM are 14.19.0 and 7.0.0 respectively.

### Docker

To give the Docker container access to the OpenAPI description files, you need to
mount the containing directory as a volume. Assuming the API description is rooted
in the current working directory, you need the following command:

```
docker run --rm -v $PWD:/spec redocly/cli lint path-to-root-file.yaml
```

To build and run with a local image, run the following from the project root:

```
docker build -t redocly/cli .
docker run --rm -v $PWD:/spec redocly/cli lint path-to-root-file.yaml
```

## Common tasks

### Generate API reference documentation

Redocly CLI is a great way to render API reference documentation. It uses open source [Redoc](https://github.com/redocly/redoc) to build your documentation. Use a command like this:

```
redocly build-docs openapi.yaml
```

Your API reference docs are in `redoc-static.html` by default. You can customize this in many ways. [Read the main docs](https://redocly.com/docs/cli/commands/build-docs) for more information.

> :bulb: Redocly also has [hosted API reference docs](https://redocly.com/docs/api-registry/guides/api-registry-quickstart/), a (commercial) alternative to Redoc. Both Redoc and Redocly API reference docs can be worked on locally using the `preview-docs` command.

### Lint an API description against a standard

Check your API meets the expected standards using `lint` to ensure quality in every version of your API. Our API linter is designed for speed on even large documents, so it's easy to run locally, in CI, or anywhere you need it. It's also designed for humans, with meaningful error messages to help you get your API right every time. Try it like this:

```
redocly lint openapi.yaml
```

**Configure the rules** as you wish. No JSONPath here, just type-aware expressions that understand the OpenAPI structure. You can either use the [built-in rules](https://redocly.com/docs/cli/rules) to mix-and-match your ideal API standard, or break out the tools to build your own.

**Format the output** in whatever way you need, the `stylish` output is as good as it sounds, but if you need JSON or Checkstyle outputs to integrate with other tools, we've got those too.

**Multiple files supported** so you don't need to bundle your API description to lint it, just give the entry point and Redocly CLI does the rest.

[Learn more about API standards and configuring Redocly rules](https://redocly.com/docs/cli/api-standards).

### Transform an OpenAPI description

If your OpenAPI description isn't everything you hoped it would be, enhance it with the Redocly [decorators](https://redocly.com/docs/cli/decorators) feature. This allows you to:

- Publish reference docs with a subset of endpoints for public use
- Improve the docs by adding examples and descriptions
- Adapt an existing OpenAPI description, and replace details like URLs for use on staging platforms

## Data collection

This tool [collects data](./docs/usage-data.md) to help Redocly improve our products and services. You can opt out by setting the `REDOCLY_TELEMETRY` environment variable to `off`.

## More resources

[Read the detailed docs](https://redocly.com/docs/cli/).

## Credits

Thanks to [graphql-js](https://github.com/graphql/graphql-js) and [eslint](https://github.com/eslint/eslint) for inspiration of the API description traversal approach and to [Swagger](https://github.com/swagger-api/swagger-editor), [Spectral](https://github.com/stoplightio/spectral), and [OAS-Kit](https://github.com/Mermade/oas-kit) for inspiring the recommended ruleset.

## Development

Contributions are welcome! All the information you need is in [CONTRIBUTING.md](.github/CONTRIBUTING.md).
