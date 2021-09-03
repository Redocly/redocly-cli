# `preview-docs`

## Introduction

With this command, you can preview the API reference docs on your local machine.

If you have a license key, you will get a preview of the premium Redocly API reference docs. If you don't, you will get a preview of Redoc community edition.

:::success Tip
To preview docs using the premium Redocly API reference docs, you must authenticate to the API registry first via the [`login`](./login.md) command.
:::

## Usage

```bash
openapi preview-docs <entrypoint>
openapi preview-docs <entrypoint> [--config=<path>] [--port=<value>]
openapi preview-docs <entrypoint> [--force] [--help] [--version]
openapi preview-docs <entrypoint> --version
```

## Options

option                    | type      | required?    | default     | description
--------------------------|:---------:|:------------:|:-----------:|------------
`entrypoint`              | `string`  | yes          | -           | Path to the API definition filename that you want to generate preview for. (See [the section below](#entrypoints) for more options)
`--config`                | `string`  | no           | -           | Specify path to the config file
`--force`, `-f`           | `boolean` | no           | -           | Generate preview output even when errors occur
`--help`                  | `boolean` | no           | -           | Show help
`--port`, `-p`            | `number`  | no           | 8080        | Preview port
`--skip-decorator`        | `array`   | no           | -           | Ignore certain decorators
`--skip-preprocessor`     | `array`   | no           | -           | Ignore certain preprocessors
`--use-community-edition` | `boolean` | no           | -           | Force using Redoc Community Edition for docs preview
`--version`               | `boolean` | no           | -           | Show version number

## Examples

### Entrypoints

The command behaves differently depending on how you pass an entrypoint to it and whether the [configuration file](#custom-configuration-file) exists. There are the following options:

#### Pass entrypoint directly

```bash
openapi preview-docs openapi/openapi.yaml
```

In this case, `preview-docs` will preview the definition that was passed to the command. The configuration file is ignored.

#### Pass entrypoint without extension

You can omit entrypoint's file extension when executing the `preview-docs` command. In this way, you can reference either `.yaml` or `.json` file.

```bash
# preview-docs will preview either petstore.yaml or petstore.json file in the current working directory
openapi preview-docs petstore
# preview-docs will preview either sandbox.yaml or sandbox.json file in the openapi/extra directory
openapi preview-docs openapi/extra/sandbox
```

#### Pass entrypoint via configuration file

Instead of a full path, you can use an alias assigned in your `apiDefinitions` within your `.redocly.yaml` configuration file as entrypoints. For example, `petstore`:

```bash command
openapi preview-docs petstore
```

```yaml .redocly.yaml
apiDefinitions:
  petstore: ./openapi/petstore-definition.json
```

In this case, after resolving the path behind the `petstore` alias (see the `.redocly.yaml` tab), `preview-docs` will preview the `petstore.json` definition file. The presence of the `.redocly.yaml` configuration file is mandatory.

### Custom configuration file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
openapi preview-docs --config=./another/directory/config.yaml
```

### Custom port for preview

By default, without providing the port option, the preview starts on port `8080`, so you can access the docs at `http://localhost:8080`

To specify a custom port for the preview, pass the desired value using either short or long option format:

```bash short format
openapi preview-docs -p 8888 openapi/openapi.yaml
```

```bash long format
openapi preview-docs -port 8888 openapi/openapi.yaml
```

Both commands will start the preview on port `8888`, so you can access the docs at `http://localhost:8888`
