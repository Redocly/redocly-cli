# `bundle`

## Introduction

API descriptions can grow and become difficult to manage, especially if several teams are collaborating on them. It's a good practice to maintain the reusable parts as separate files, and include them in the main (root) API description by referencing them with `$ref`. However, most OpenAPI tools don't support that multi-file approach, and require a single-file API description.

Redocly CLI can help you combine separate API description files (such as if you used the `split` command) into one. The `bundle` command pulls the relevant parts of an API description into a single file output in JSON or YAML format.

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

{% admonition type="warning" name="Important" %}
The `--lint` switch and all related options (`--extends`, `--max-problems`, `--skip-rule`, `--format`) are deprecated and are marked for removal in future releases.
Use the [lint command](./lint.md) separately to lint your APIs before bundling.
{% /admonition %}

| Option                          | Type     | Description                                                                                                                                                                                                                                                     |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis                            | [string] | List of API description root filenames or names assigned in the `apis` section of your Redocly configuration file. Default values are all names defined in the `apis` section within your configuration file.                                                   |
| --config                        | string   | Specify path to the [config file](#custom-configuration-file).                                                                                                                                                                                                  |
| --dereferenced, -d              | boolean  | Generate fully dereferenced bundle.                                                                                                                                                                                                                             |
| --ext                           | string   | Specify bundled file extension. Possible values are `json`, `yaml`, or `yml`. Default value is `yaml`.                                                                                                                                                          |
| --extends (**Deprecated**)      | [string] | Can be used in combination with `--lint` to [extend a specific configuration](./lint.md#extend-configuration). Default values are taken from the Redocly configuration file.                                                                                    |
| --force, -f                     | boolean  | Generate bundle output even when errors occur.                                                                                                                                                                                                                  |
| --format (**Deprecated**)       | string   | Format for the output. Possible values are `codeframe`, `stylish`, `json`, or `checkstyle`. Default value is `codeframe`.                                                                                                                                       |
| --help                          | boolean  | Show help.                                                                                                                                                                                                                                                      |
| --keep-url-references, -k       | boolean  | Keep absolute url references.                                                                                                                                                                                                                                   |
| --lint (**Deprecated**)         | boolean  | Lint API description files. Default value is `false`.                                                                                                                                                                                                           |
| --lint-config                   | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                              |
| --max-problems (**Deprecated**) | integer  | Truncate output to display the specified maximum number of problems. Default value is `100`.                                                                                                                                                                    |
| --metafile                      | string   | Path for the bundle metadata file.                                                                                                                                                                                                                              |
| --output, -o                    | string   | Name or folder for the bundle file. If you don't specify the file extension, `.yaml` is used by default. If the specified folder doesn't exist, it's created automatically. **If the file specified as the bundler's output already exists, it's overwritten.** |
| --remove-unused-components      | boolean  | Remove unused components from the `bundle` output.                                                                                                                                                                                                              |
| --skip-decorator                | [string] | Ignore certain decorators. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).                                                                                                                                       |
| --skip-preprocessor             | [string] | Ignore certain preprocessors. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).                                                                                                                                    |
| --skip-rule (**Deprecated**)    | [string] | Ignore certain rules. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).                                                                                                                                            |
| --version                       | boolean  | Show version number.                                                                                                                                                                                                                                            |

## Examples

### Bundle a single API description

This command creates a bundled file at the path `dist/openapi.json` starting from the root API description file `openapi/openapi.yaml` and following the `$ref` to other files if appropriate. The bundled file is in JSON format.

```bash
redocly bundle openapi/openapi.yaml --output dist/openapi.json
```

### Bundle multiple API descriptions

This command creates one bundled file for each of the specified apis in the `dist/` folder. Bundled files are in JSON format.

```bash Command
redocly bundle --output dist --ext json openapi/openapi.yaml openapi/petstore.yaml
```

```bash Output
dist/openapi.json
dist/petstore.json
```

### Create a fully dereferenced bundle

A fully dereferenced bundle does not use `$ref` at all, all the references are resolved and placed into the API description file. This can be useful if you need to prepare an OpenAPI file to be used by another tool that does not understand the `$ref` syntax.

```bash
redocly bundle --dereferenced --output dist --ext json openapi/openapi.yaml openapi/petstore.yaml
```

{% admonition type="warning" name="Note" %}
JSON output only works when there are no circular references.
{% /admonition %}

### Custom configuration file

By default, the CLI tool looks for the Redocly configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly bundle --config=./another/directory/config.yaml
```

### Format

#### Codeframe (default)

```bash
redocly bundle pet.yaml store.yaml -o ./bundled --format=codeframe
## equivalent to: redocly bundle pet.yaml store.yaml -o ./bundled
```

Note: Errors display in the following format: `file:line:column`. For example, `petstore-with-errors.yaml:16:3`.

Depending on the terminal emulator you use, it may be possible to directly click this indicator to edit the file in place.

#### Stylish

```bash
redocly bundle pet.yaml store.yaml -o ./bundled --format=stylish
```

In this format, `bundle` shows the filename, line number, and column where the problem occurred.

The compressed output omits other contexts and suggestions.

#### JSON

{% tabs %}
{% tab label="Command" %}

```bash
redocly bundle pet.yaml store.yaml -o ./bundled --format=json
```

{% /tab  %}
{% tab label="Output" %}

```bash
bundling pet.yaml...
{
  "totals": {
    "errors": 0,
    "warnings": 0,
    "ignored": 0
  },
  "version": "1.0.0-beta.54",
  "problems": []
}📦 Created a bundle for pet.yaml at bundled/pet.yaml 28ms.
bundling store.yaml...
{
  "totals": {
    "errors": 0,
    "warnings": 0,
    "ignored": 0
  },
  "version": "1.0.0-beta.54",
  "problems": []
}📦 Created a bundle for store.yaml at bundled/store.yaml 15ms.
```

{% /tab  %}
{% /tabs  %}

In this format, `bundle` shows the result of bundling (including the number of errors and warnings and their descriptions) in JSON-like output.

#### Checkstyle

{% tabs %}
{% tab label="Command" %}

```bash
redocly bundle pet.yaml -o ./bundled --lint --format=checkstyle
```

{% /tab  %}
{% tab label="Output" %}

```bash
bundling pet.yaml...
<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="4.3">
<file name="pet.yaml">
</file>
</checkstyle>
📦 Created a bundle for pet.yaml at bundled/pet.yaml 35ms.
```

{% /tab  %}
{% /tabs  %}
In this format, `bundle` uses the [Checkstyle](https://checkstyle.org/) XML report format.
Due to the limitations of this format, the output _only_ includes the filename, line, column, severity,
and rule ID (in the `source` attribute).
All other information is omitted.

### Skip preprocessor, rule, or decorator

You may want to skip specific preprocessors, rules, or decorators upon running the command.
{% tabs %}
{% tab label="Skip preprocessors" %}

```bash
redocly bundle --skip-preprocessor=discriminator-mapping-to-one-of --skip-preprocessor=another-example
```

{% /tab  %}
{% tab label="Skip rules" %}

```bash
redocly bundle --skip-rule=no-sibling-refs --skip-rule=no-parent-tags
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
