# `preview-docs`

## Introduction

With this command, you can preview the API reference docs on your local machine.

If you have a license key or API key, you will get a preview of the premium [Redocly API reference docs](https://redoc.ly/reference-docs). If you don't, you will get a preview of [Redoc community edition](https://redoc.ly/redoc).

:::success Tip
To preview docs using the premium Redocly API reference docs, you must first authenticate to the API registry with the [`login`](./login.md) command.
:::

## Usage

```bash
openapi preview-docs <entrypoint>
openapi preview-docs <entrypoint> [--config=<path>] [--port=<value>]
openapi preview-docs <entrypoint> [--force] [--help] [--version]
openapi preview-docs <entrypoint> --version
```

## Options

Option                    | Type      | Required     | Default     | Description
--------------------------|:---------:|:------------:|:-----------:|------------
`entrypoint`              | `string`  | yes          | -           | Path to the API definition file or a configured alias for the API definition that you want to preview. Refer to [the entrypoints section](#entrypoints) for more options
`--config`                | `string`  | no           | -           | Specify path to the config file
`--force`, `-f`           | `boolean` | no           | -           | Generate preview output even when errors occur
`--help`                  | `boolean` | no           | -           | Show help
`--port`, `-p`            | `number`  | no           | 8080        | Specify the port where the documentation preview can be accessed. You can set any port as long as it is not used by applications in your operating system.
`--skip-decorator`        | `array`   | no           | -           | Ignore [certain decorators](#skip-preprocessor-or-decorator)
`--skip-preprocessor`     | `array`   | no           | -           | Ignore [certain preprocessors](#skip-preprocessor-or-decorator)
`--use-community-edition` | `boolean` | no           | -           | Force using Redoc Community Edition for docs preview
`--version`               | `boolean` | no           | -           | Show version number

## Examples

### Entrypoints

The command behaves differently depending on how you pass a path to the entrypoint to it and whether the [configuration file](#custom-configuration-file) exists.

#### Pass entrypoint directly

```bash
openapi preview-docs openapi/openapi.yaml
```

In this case, `preview-docs` will preview the definition that was passed to the command. The configuration file is ignored.

#### Pass entrypoint alias

Instead of a full path, you can use an alias assigned in the `apiDefinitions` section within your `.redocly.yaml` configuration file as the entrypoint. For example, `petstore`:

```bash command
openapi preview-docs petstore
```

```yaml .redocly.yaml
apiDefinitions:
  petstore: ./openapi/petstore-definition.json
```

In this case, after resolving the path behind the `petstore` alias (example in the `.redocly.yaml` tab), `preview-docs` will preview the `petstore.json` definition file. For this approach, the `.redocly.yaml` configuration file is mandatory.

### Custom configuration file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
openapi preview-docs --config=./another/directory/config.yaml
```

### Custom port for preview

By default, without using the `port` option, the preview starts on port `8080`, so you can access the docs at `http://localhost:8080`

To specify a custom port for the preview, pass the desired value using either short or long option format:

```bash short format
openapi preview-docs -p 8888 openapi/openapi.yaml
```

```bash long format
openapi preview-docs -port 8888 openapi/openapi.yaml
```

Both commands will start the preview on port `8888`, so you can access the docs at `http://localhost:8888`


### Skip preprocessor or decorator

You may want to skip specific preprocessors, rules, or decorators upon running the command.

```bash Skip preprocessors
openapi bundle --skip-preprocessor=discriminator-mapping-to-one-of,another-example
```

```bash Skip decorators
openapi bundle --skip-decorator=generate-code-samples,remove-internal-operations
```