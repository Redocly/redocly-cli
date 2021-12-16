# `bundle`

## Introduction

API definitions can grow and become difficult to manage, especially if several teams are collaborating on them. It's a good practice to maintain the reusable parts as separate files, and include them in the main (root) API definition by referencing them with `$ref`. However, most OpenAPI tools do not support that multi-file approach, and require a single-file API definition.

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

Option                 | Type      | Required?    | Default     | Description
-----------------------|:---------:|:------------:|:-----------:|------------
`entrypoints`          | `array`   | yes          | `[]`        | Array of API root definition filenames that need to be bundled. Instead of full paths, you can use aliases assigned in the `apiDefinitions` section within your `.redocly.yaml` configuration file as entrypoints.
`--config`             | `string`  | no           | -           | Specify path to the [config file](#custom-configuration-file)
`--dereferenced`, `-d` | `boolean` | no           | -           | Generate fully dereferenced bundle
`--ext`                | `string`  | no           | `yaml`      | Specify bundled file extension.<br />**Possible values:** `json`, `yaml`, `yml`
`--extends`            | `array`   | no           | -           | Can be used in combination with `--lint` to [Extend a specific configuration](./lint.md#extend-configuration) (defaults or config file settings)
`--force`, `-f`        | `boolean` | no           | -           | Generate bundle output even when errors occur
`--format`             | `string`  | no           | `codeframe` | Format for the output.<br />**Possible values:** `codeframe`, `stylish`, `json`
`--help`               | `boolean` | no           | -           | Show help
`--lint`               | `boolean` | no           | `false`     | Lint definition files.
`--max-problems`       | `number`  | no           | 100         | Truncate output to display the specified maximum number of problems
`--metafile`           | `string`  | no           | -           | Path for the bundle metadata file. For example, `--metafile ./bundle.metadata.json`
`--output`, `-o`       | `string`  | no           | -           | Name or folder for the bundle file. For example, `-o bundle.yaml` or `-o ./openapi`.<li>If you don't specify the extension, `.yaml` will be used by default.</li><li>If the specified folder doesn't exist, it will be created automatically.</li><br />**If the file specified as the bundler's output already exists, it will be overwritten**
`--skip-decorator`     | `array`   | no           | -           | Ignore certain decorators. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator) below
`--skip-preprocessor`  | `array`   | no           | -           | Ignore certain preprocessors. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator) below
`--skip-rule`          | `array`   | no           | -           | Ignore certain rules. See the [Skip preprocessor, rule, or decorator section](#skip-preprocessor-rule-or-decorator) below
`--version`            | `boolean` | no           | -           | Show version number

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

Note: Any errors are displayed in the following format: `file:line:column`. For example, `petstore-with-errors.yaml:16:3`.

Depending on the terminal emulator you use, it may be possible to directly click this indicator to edit the file in place.

#### Stylish

```bash request
openapi bundle pet.yaml store.yaml -o ./bundled --format=stylish
```

```bash output
...
```

In this format, `bundle` shows the file name, line number, and column where the problem occurred. However, the output is compressed and omits other contexts and suggestions.

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
