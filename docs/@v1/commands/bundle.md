# `bundle`

## Introduction

API descriptions can grow and become difficult to manage, especially if several teams are collaborating on them. It's a good practice to maintain the reusable parts as separate files, and include them in the main (root) API description by referencing them with `$ref`. However, most OpenAPI tools don't support that multi-file approach, and require a single-file API description.

Redocly CLI can help you combine separate API description files (such as if you used the [`split`](./split.md) command) into one. The `bundle` command pulls the relevant parts of an API description into a single file output in JSON or YAML format.

The `bundle` command differs from the [`join`](./join.md) command. The `bundle` command takes a root OpenAPI file as input and follows the `$ref` mentions to include all the referenced components into a single output file. The `join` command can combine multiple OpenAPI files into a single unified API description file.

The `bundle` command first executes preprocessors, then rules, then decorators.

## Usage

```bash
redocly bundle <apis>...
redocly bundle <apis> [--remove-unused-components]
redocly bundle <apis> [--config=<path>]
redocly bundle <apis>... -o <outputName> --ext <ext>
redocly bundle --version
```

## Options

| Option                     | Type     | Description                                                                                                                                                                                                                                               |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis                       | [string] | List of API description root filenames or names assigned in the `apis` section of your Redocly configuration file. Default values are names defined in the `apis` section of your configuration file.                                                     |
| --config                   | string   | Specify the path to the [configuration file](#use-alternative-configuration-file).                                                                                                                                                                        |
| --dereferenced, -d         | boolean  | Generate fully dereferenced bundle.                                                                                                                                                                                                                       |
| --ext                      | string   | Specify the bundled file's extension. The possible values are `json`, `yaml`, or `yml`. The default value is `yaml`.                                                                                                                                      |
| --extends                  | [string] | Can be used in combination with `--lint` to [extend a specific configuration](./lint.md#extend-configuration). The default values are taken from the Redocly configuration file.                                                                          |
| --force, -f                | boolean  | Generate a bundle output even when errors occur.                                                                                                                                                                                                          |
| --help                     | boolean  | Show help.                                                                                                                                                                                                                                                |
| --keep-url-references, -k  | boolean  | Preserve absolute URL references.                                                                                                                                                                                                                         |
| --lint-config              | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. The default value is `warn`.                                                                                                                    |
| --metafile                 | string   | Path for the bundle metadata file.                                                                                                                                                                                                                        |
| --output, -o               | string   | Name or folder for the bundle file specified using the command line. If you don't specify the file extension, `.yaml` is used by default. If the specified folder doesn't exist, it's created automatically. **Overwrites existing bundler output file.** |
| --remove-unused-components | boolean  | Remove unused components from the `bundle` output.                                                                                                                                                                                                        |
| --skip-decorator           | [string] | Ignore certain decorators. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).                                                                                                                                 |
| --skip-preprocessor        | [string] | Ignore certain preprocessors. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).                                                                                                                              |
| --version                  | boolean  | Show version number.                                                                                                                                                                                                                                      |

## Examples

### Bundle a single API description

This command creates a bundled file at the path `dist/openapi.json` starting from the root API description file `openapi/openapi.yaml` and following the `$ref` to other files if appropriate. The bundled file is in JSON format.

```bash
redocly bundle openapi/openapi.yaml --output dist/openapi.json
```

### Bundle multiple API descriptions

This command creates one bundled file for each of the specified apis in the `dist/` folder. Bundled files are in JSON format.

```bash Command
redocly bundle --output dist --ext json openapi/openapi.yaml openapi/museum.yaml
```

The `dist/` folder contents after the `bundle` command is executed:

<pre>
dist/openapi.json
dist/museum.json
</pre>

Alternatively, you can specify the default `output` location for a bundled API in the `apis` section of your Redocly configuration file.
This is especially useful when bundling multiple APIs.

```yaml
apis:
  orders@v1:
    root: orders/openapi.yaml
    output: dist/orders.json
  accounts@v1:
    root: accounts/openapi.yaml
    output: dist/accounts.json
```

Given the `redocly.yaml` configuration file above, the following command bundles the APIs `foo` and `bar` into the `dist/` folder.

```bash
redocly bundle
```

Please note, that providing an API to the `bundle` command results in the command bundling only the specified API.
Additionally, the `--output` option is only meaningful when used with APIs specified in the command line.

### Create a fully dereferenced bundle

A fully dereferenced bundle does not use `$ref` at all, all the references are resolved and placed into the API description file. This can be useful if you need to prepare an OpenAPI file to be used by another tool that does not understand the `$ref` syntax.

```bash
redocly bundle --dereferenced --output dist --ext json openapi/openapi.yaml openapi/museum.yaml
```

{% admonition type="warning" name="Note" %}
JSON output only works when there are no circular references.
{% /admonition %}

### Use alternative configuration file

By default, the CLI tool looks for the Redocly configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly bundle --config=./another/directory/config.yaml
```

### Skip preprocessor, rule, or decorator

You may want to skip specific preprocessors, rules, or decorators upon running the command.
{% tabs %}
{% tab label="Skip preprocessors" %}

```bash
redocly bundle --skip-preprocessor=discriminator-mapping-to-one-of --skip-preprocessor=another-example
```

{% /tab  %}
{% tab label="Skip decorators" %}

```bash
redocly bundle --skip-decorator=generate-code-samples --skip-decorator=remove-internal-operations
```

{% /tab  %}
{% /tabs  %}
{% admonition type="success" name="Tip" %}
To learn more about preprocessors, rules, and decorators, refer to the [custom plugins](../custom-plugins/index.md) page.
{% /admonition %}
