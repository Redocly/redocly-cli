# `preview-docs`

## Introduction

With this command, you can generate documentation previews for API definitions on your local machine.

If you have a license key or API key, you will get a preview of the premium [Redocly API reference docs](https://redocly.com/reference-docs). If you don't, you will get a preview of [Redoc community edition](https://redocly.com/redoc).

:::success Tip
To preview docs using the premium Redocly API reference docs, you must first authenticate to the API registry with the [`login`](./login.md) command.
:::

## Usage

```bash
openapi preview-docs <entrypoint> [branchName]
openapi preview-docs <entrypoint> [--config=<path>] [--port=<value>] [--host=<host>] [branchName]
openapi preview-docs <entrypoint> [--force] [--help] [--version] [branchName]
openapi preview-docs <entrypoint> --version
```

## Options

Option                    | Type      | Required     | Default     | Description
--------------------------|:---------:|:------------:|:-----------:|------------
`entrypoint`              | `string`  | yes          | -           | Path to the API definition filename or alias that you want to generate the preview for. Refer to [the entrypoints section](#entrypoints) for more options.
`--config`                | `string`  | no           | -           | Specify path to the [configuration file](#custom-configuration-file)
`--force`, `-f`           | `boolean` | no           | -           | Generate preview output even when errors occur
`--help`                  | `boolean` | no           | -           | Show help
`--port`, `-p`            | `number`  | no           | 8080        | Specify the port where the documentation preview can be accessed. You can set any port as long as it is not used by applications in your operating system.
`--host`, `-h`            | `string`  | no           | 127.0.0.1   | Specify the host where the documentation preview can be accessed.
`--skip-decorator`        | `array`   | no           | -           | Ignore [certain decorators](#skip-preprocessor-or-decorator)
`--skip-preprocessor`     | `array`   | no           | -           | Ignore [certain preprocessors](#skip-preprocessor-or-decorator)
`--use-community-edition` | `boolean` | no           | -           | Force using Redoc Community Edition for docs preview
`--version`               | `boolean` | no           | -           | Show version number

## Examples

### Entrypoints

The command behaves differently depending on how you pass the entrypoint to it, and whether the [configuration file](#custom-configuration-file) exists.

#### Pass entrypoint directly

```bash
openapi preview-docs openapi/openapi.yaml
```

In this case, `preview-docs` will preview the definition that was passed to the command. The configuration file is ignored.

#### Pass entrypoint alias

Instead of a full path, you can use an API name from the `apis` section of your Redocly configuration file as the entrypoint.

```bash Command
openapi preview-docs main
```

```yaml Configuration file
apis:
  main:
    root: ./openapi/definition.json
```

In this case, after resolving the path behind the `main` name (see the `Configuration file` tab), `preview-docs` generates a preview of the `definition.json` file. For this approach, the Redocly configuration file is mandatory.

### Custom configuration file

By default, the CLI tool looks for the [Redocly configuration file](/docs/cli/configuration/configuration-file.mdx) in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
openapi preview-docs --config=./another/directory/config.yaml
```

### Custom port for preview

By default, without using the `port` option, the preview starts on port `8080`, so you can access the docs at `http://localhost:8080`

To specify a custom port for the preview, pass the desired value using either short or long option format:

```bash Short format
openapi preview-docs -p 8888 openapi/openapi.yaml
```

```bash Long format
openapi preview-docs -port 8888 openapi/openapi.yaml
```

Both commands will start the preview on port `8888`, so you can access the docs at `http://localhost:8888`

### Custom host for preview

By default, without using the `host` option, the preview starts on host `127.0.0.1`, so you can access the docs at `http://127.0.0.1:8080` or `http://localhost:8080`

To specify a custom host for the preview, pass the desired value using either short or long option format:

```bash Short format
openapi preview-docs -h 0.0.0.0 openapi/openapi.yaml
```

```bash Long format
openapi preview-docs --host 0.0.0.0 openapi/openapi.yaml
```

Both commands will start the preview on host `0.0.0.0`, so you can access the docs at `http://0.0.0.0:8080`


### Skip preprocessor or decorator

You may want to skip specific preprocessors, rules, or decorators upon running the command.

```bash Skip preprocessors
openapi preview-docs --skip-preprocessor=discriminator-mapping-to-one-of,another-example
```

```bash Skip decorators
openapi preview-docs --skip-decorator=generate-code-samples,remove-internal-operations
```
