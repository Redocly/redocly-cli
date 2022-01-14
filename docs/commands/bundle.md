# `bundle`

## Introduction

API definitions can grow and become difficult to manage, especially if several teams are collaborating on them. It's a good practice to maintain the reusable parts as separate files, and include them in the main (root) API definition by referencing them with `$ref`. However, most OpenAPI tools don't support that multi-file approach, and require a single-file API definition.

Redocly OpenAPI CLI can help you combine separate API definition files into one. The `bundle` command pulls the relevant parts of an API definition into a single file output in JSON or YAML format.

The `bundle` command first executes preprocessors, then rules, then decorators.

:::success Tip
To learn more about preprocessors, rules, and decorators, refer to the [custom rules](../resources/custom-rules.md) page.
:::

## Usage

```bash
openapi bundle <entrypoints>...
openapi bundle <entrypoints> [--max-problems=<n>]
openapi bundle <entrypoints> [--lint] [--config=<path>]
openapi bundle <entrypoints>... -o <outputName> --ext <ext>
openapi bundle --version
```

## Options

Option | Type | Description
-- | -- | --
entrypoints | [string] | List of API root definition filenames or aliases assigned in the `apiDefinitions` section within your `.redocly.yaml` configuration file. Default values are all aliases defined in the `apiDefinitions` section within your configuration file.
--config | string | Specify path to the [config file](#custom-configuration-file).
--dereferenced, -d | boolean | Generate fully dereferenced bundle.
--ext | string | Specify bundled file extension. Possible values are `json`, `yaml`, or `yml`. Default value is `yaml`.
--extends | [string] | Can be used in combination with `--lint` to [extend a specific configuration](./lint.md#extend-configuration).  Default values are taken from the configuration file.
--force, -f | boolean | Generate bundle output even when errors occur.
--format | string | Format for the output. Possible values are `codeframe`, `stylish`, `json`, or `checkstyle`. Default value is `codeframe`.
--help | boolean | Show help.
--lint | boolean | Lint definition files. Default value is `false`.
--max-problems | integer | Truncate output to display the specified maximum number of problems. Default value is `100`.
--metafile | string | Path for the bundle metadata file.
--output, -o | string | Name or folder for the bundle file. If you don't specify the file extension, `.yaml` is used by default. If the specified folder doesn't exist, it's created automatically. **If the file specified as the bundler's output already exists, it's overwritten.**
--skip-decorator | [string] | Ignore certain decorators. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).
--skip-preprocessor | [string] | Ignore certain preprocessors. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).
--skip-rule | [string] | Ignore certain rules. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator).
--version | boolean | Show version number.


## Examples

### Bundle a single API definition

This command creates a bundled file at the path `dist/openapi.json` starting from the root API definition file `openapi/openapi.yaml`. The bundled file is in JSON format.

```bash
openapi bundle openapi/openapi.yaml --output dist/openapi.json
```

### Bundle multiple API definitions

This command creates one bundled file for each of the specified entrypoints in the `dist/` folder. Bundled files are in JSON format.

```bash request
openapi bundle --output dist --ext json openapi/openapi.yaml openapi/petstore.yaml
```

```bash output
dist/openapi.json
dist/petstore.json
```

### Create a fully dereferenced bundle

:::warning Note
JSON output only works when there are no circular references.
:::

```bash
openapi bundle --dereferenced --output dist --ext json openapi/openapi.yaml openapi/petstore.yaml
```

### Custom configuration file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
openapi bundle --config=./another/directory/config.yaml
```

### Format

#### Codeframe (default)

```bash request
openapi bundle pet.yaml store.yaml -o ./bundled --format=codeframe
## equivalent to: openapi bundle pet.yaml store.yaml -o ./bundled
```

```bash output
...
```

Note: Errors display in the following format: `file:line:column`. For example, `petstore-with-errors.yaml:16:3`.

Depending on the terminal emulator you use, it may be possible to directly click this indicator to edit the file in place.

#### Stylish

```bash request
openapi bundle pet.yaml store.yaml -o ./bundled --format=stylish
```

```bash output
...
```

In this format, `bundle` shows the filename, line number, and column where the problem occurred.
The compressed output omits other contexts and suggestions.

#### JSON

```bash request
openapi bundle pet.yaml store.yaml -o ./bundled --format=json
```

```bash output
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

In this format, `bundle` shows the result of bundling (including the number of errors and warnings and their descriptions) in JSON-like output.

#### Checkstyle

```bash request
openapi bundle pet.yaml -o ./bundled --lint --format=checkstyle
```

```bash output
bundling pet.yaml...
<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="4.3">
<file name="pet.yaml">
</file>
</checkstyle>
📦 Created a bundle for pet.yaml at bundled/pet.yaml 35ms.
```

In this format, `bundle` uses the [Checkstyle](https://checkstyle.org/) XML report format.
Due to the limitations of this format, the output _only_ includes the filename, line, column, severity,
and rule ID (in the `source` attribute).
All other information is omitted.

### Skip preprocessor, rule, or decorator

You may want to skip specific preprocessors, rules, or decorators upon running the command.

```bash Skip preprocessors
openapi bundle --skip-preprocessor=discriminator-mapping-to-one-of,another-example
```

```bash Skip rules
openapi bundle --skip-rule=no-sibling-refs,no-parent-tags
```

```bash Skip decorators
openapi bundle --skip-decorator=generate-code-samples,remove-internal-operations
```

:::success Tip
To learn more about preprocessors, rules, and decorators, refer to the [custom rules](../resources/custom-rules.md) page.
:::
