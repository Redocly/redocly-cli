# `bundle`

## Introduction

API definitions can grow and become difficult to manage, especially if several teams are collaborating on them. It's a good practice to maintain the reusable parts as separate files, and include them in the main (root) API definition by referencing them with `$ref`. However, most OpenAPI tools do not support that multi-file approach, and require a single-file API definition.

Redocly OpenAPI CLI can help you combine separate API definition files into one. The `bundle` command pulls the relevant parts of an API definition into a single file output in JSON or YAML format.

The `bundle` command first executes preprocessors, then rules, then decorators.

:::success Tip
To learn more about preprocessors, rules, and decorators, please refer to [this](../custom-rules.md) document.
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

option                 | type      | required?    | default     | description
-----------------------|:---------:|:------------:|:-----------:|------------
`entrypoints`          | `array`   | yes          | `[]`        | Array of API root definition filenames that need to be bundled. Instead of full paths, you can use aliases assigned in your `apiDefinitions` within your `.redocly.yaml` configuration file as entrypoints.
`--config`             | `string`  | no           | -           | Specify path to the config file
`--dereferenced`, `-d` | `boolean` | no           | -           | Generate fully dereferenced bundle
`--ext`                | `string`  | no           | `yaml`      | Specify bundled file extension.<br />**Possible values:** `json`, `yaml`, `yml`
`--force`, `-f`        | `boolean` | no           | -           | Generate bundle output even when errors occur
`format`               | `string`  | no           | `codeframe` | Format for the output.<br />**Possible values:** `codeframe`, `stylish`
`--help`               | `boolean` | no           | -           | Show help
`--lint`               | `boolean` | no           | `false`     | Lint definition files
`--max-problems`       | `number`  | no           | 100         | Truncate output to display the specified maximum number of problems
`--output`, `-o`       | `string`  | no           | -           | Name or folder for the bundle file. For example, `-o bundle.yaml` or `-o ./openapi`.<li>If you don't specify the extension, `.yaml` will be used by default.</li><li>If the specified folder doesn't exist, it will be created automatically.</li><br />**If the file specified as the bundler's output already exists, it will be overwritten**
`--skip-decorator`     | `array`   | no           | -           | Ignore certain decorators
`--skip-preprocessor`  | `array`   | no           | -           | Ignore certain preprocessors
`--skip-rule`          | `array`   | no           | -           | Ignore certain rules
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
