# `preview-docs`

## Introduction

With the `preview-docs` command, you can generate documentation previews for API descriptions on your local machine.
Use the previews to develop your API descriptions locally before deployment.

If you have a license key or API key configured, the output is a preview of the premium [Redocly API reference docs](https://redocly.com/reference/). Otherwise, it is a preview of [Redoc community edition](https://redocly.com/redoc/).

{% admonition type="success" name="Tip" %}
To preview docs using the premium Redocly API reference docs, you must first authenticate to the API registry with the [`login`](./login.md) command.
{% /admonition %}

## Usage

```bash
redocly preview-docs <api>
redocly preview-docs <api> [--config=<path>] [--port=<value>] [--host=<host>]
redocly preview-docs <api> [--force] [--help] [--version]
redocly preview-docs <api> --version
```

## Options

| Option                  | Type     | Description                                                                                                                                                                |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api                     | string   | Path to the API description filename or alias that you want to generate the preview for. Refer to [the API section](#specify-api) for more details.                        |
| --config                | string   | Specify path to the [configuration file](#use-alternative-configuration-file).                                                                                             |
| --force, -f             | boolean  | Generate preview output even when errors occur.                                                                                                                            |
| --help                  | boolean  | Show help.                                                                                                                                                                 |
| --host, -h              | string   | The host where the documentation preview can be accessed. The default value is `127.0.0.1`.                                                                                |
| --lint-config           | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                         |
| --port, -p              | integer  | The port where the documentation preview can be accessed. You can set any port number over 1024 as long as it is not already being used. The default value is port `8080`. |
| --skip-decorator        | [string] | Ignore [certain decorators](#skip-preprocessor-or-decorator).                                                                                                              |
| --skip-preprocessor     | [string] | Ignore [certain preprocessors](#skip-preprocessor-or-decorator).                                                                                                           |
| --use-community-edition | boolean  | Use Redoc Community Edition for docs preview.                                                                                                                              |
| --version               | boolean  | Show version number.                                                                                                                                                       |

## Examples

### Specify API

The `preview-docs` command behaves differently depending on how you pass the API to it, and whether the [configuration file](#use-alternative-configuration-file) exists.

#### Pass an API directly

```bash
redocly preview-docs openapi/openapi.yaml
```

In this case, `preview-docs` previews the API description that was passed to the command. Any configuration file is ignored.

#### Pass an API alias

Instead of a full path, you can use an API name from the `apis` section of your Redocly configuration file.
For example, with a `redocly.yaml` configuration file containing the following entry for `core@v1`:

```yaml
apis:
  core@v1:
    root: ./openapi/api-description.json
```

You can generate a preview by giving the API alias name, as shown below:

```bash
redocly preview-docs core@v1
```

In this case, after resolving the path behind the `core@v1` name, `preview-docs` generates a preview of the `api-description.json` file. For this approach, the Redocly configuration file is mandatory.

### Use alternative configuration file

By default, the CLI tool looks for the [Redocly configuration file](../configuration/index.md) in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file:

```bash
redocly preview-docs --config=./another/directory/config.yaml
```

### Use custom port for preview

By default, without using the `port` option, the preview starts on port `8080`, so you can access the docs at `http://localhost:8080`

To specify a custom port for the preview, pass the desired value using either short or long option format:
{% tabs %}
{% tab label="Short format" %}

```bash
redocly preview-docs -p 8888 openapi/openapi.yaml
```

{% /tab  %}
{% tab label="Long format" %}

```bash
redocly preview-docs -port 8888 openapi/openapi.yaml
```

{% /tab  %}
{% /tabs  %}

Both commands start the preview on port `8888`, so you can access the docs at `http://localhost:8888`.

### Use custom host for preview

By default, without using the `host` option, the preview starts on host `127.0.0.1`, so you can access the docs at `http://127.0.0.1:8080` or `http://localhost:8080`.

To specify a custom host for the preview, pass the desired value using either short or long option format:
{% tabs %}
{% tab label="Short format" %}

```bash
redocly preview-docs -h 0.0.0.0 openapi/openapi.yaml
```

{% /tab  %}
{% tab label="Long format" %}

```bash
redocly preview-docs --host 0.0.0.0 openapi/openapi.yaml
```

{% /tab  %}
{% /tabs  %}

Both commands start the preview on host `0.0.0.0`, so you can access the docs at `http://0.0.0.0:8080`

### Skip preprocessor or decorator

You may want to skip specific preprocessors, rules, or decorators upon running the command.
{% tabs %}
{% tab label="Skip preprocessors" %}

```bash
redocly preview-docs --skip-preprocessor=discriminator-mapping-to-one-of --skip-preprocessor=another-example
```

{% /tab  %}
{% tab label="Skip decorators" %}

```bash
redocly preview-docs --skip-decorator=generate-code-samples --skip-decorator=remove-internal-operations
```

{% /tab  %}
{% /tabs  %}
