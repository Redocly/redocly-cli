# `lint`

## Introduction

Redocly OpenAPI CLI can identify and report on problems found in OpenAPI definitions. This helps you avoid bugs and make API definitions more consistent.

The `lint` command reports on problems and executes preprocessors and rules. Unlike the `bundle` command, `lint` doesn't execute decorators.

:::success Tip
To learn more about preprocessors and rules, refer to the [custom rules](../resources/custom-rules.md) page.
:::

## Usage

```bash
openapi lint
openapi lint <entrypoints>...
openapi lint [--max-problems=<n>] [--config=<path>] [--format=<value>]
openapi lint [--generate-ignore-file] [--help]
openapi lint --version
```

## Options

Option                   | Type      | Required    | Default     | Description
-------------------------|:---------:|:------------:|:-----------:|------------
`entrypoints`            | `array`   | no           | -           | Array of API definition filenames that need to be linted. See [the Entrypoints section](#entrypoints) for more options
`--config`               | `string`  | no           | -           | Specify path to the [configuration file](#custom-configuration-file)
`--extends`              | `array`   | no           | -           | [Extend a specific configuration](#extend-configuration) (defaults or config file settings)
`--format`               | `string`  | no           | `codeframe` | Format for the output.<br />**Possible values:** `codeframe`, `stylish`, `json`, `checkstyle`
`--generate-ignore-file` | `boolean` | no           | -           | [Generate ignore file](#generate-ignore-file)
`--help`                 | `boolean` | no           | -           | Show help
`--max-problems`         | `number`  | no           | 100         | Truncate output to display the specified [maximum number of problems](#max-problems)
`--skip-preprocessor`    | `array`   | no           | -           | Ignore certain preprocessors. See the [Skip preprocessor or rule section](#skip-preprocessor-or-rule) below
`--skip-rule`            | `array`   | no           | -           | Ignore certain rules. See the [Skip preprocessor or rule section](#skip-preprocessor-or-rule) below
`--version`              | `boolean` | no           | -           | Show version number

## Examples

### Entrypoints

The `lint` command behaves differently depending on how you pass entrypoints to it and whether the [configuration file](#custom-configuration-file) exists.

#### Pass entrypoints directly

```bash
openapi lint openapi/openapi.yaml
```

In this case, `lint` will validate the definition(s) passed to the command. The configuration file is ignored.

The `entrypoints` argument can also use any glob format supported by your file system. For example, `openapi lint ./root-documents/*.yaml`.

#### Pass entrypoints via configuration file

Instead of full paths, you can use names listed in the `apis` section of your Redocly configuration file as entrypoints.

```bash Command
openapi lint main
```

```yaml Configuration file
apis:
  main:
    root: ./openapi/definition.json
```

In this case, after resolving the path behind the `main` name (see the `Configuration file` tab), `lint` will validate the `definition.json` file. The presence of the Redocly configuration file is mandatory.

#### Empty entrypoints

You can omit entrypoints completely when executing the `lint` command.

```bash Command
openapi lint
```

```yaml Configuration file
apis:
  main:
    root: ./openapi/definition.json
  production:
    root: ./openapi/production.yaml
  sandbox:
    root: ./openapi/sandbox.yaml
```

In this case, if no API definitions are specified, `lint` validates all entrypoints listed under `apis` in your Redocly configuration file. The presence of the configuration file is mandatory.

:::warning Important

If you try to execute the `lint` command without entrypoints when your project doesn't have any configuration files, the `lint` command will display an error.

:::

### Custom configuration file

By default, the CLI tool looks for the [Redocly configuration file](/docs/cli/configuration/configuration-file.mdx) in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
openapi lint --config=./another/directory/config.yaml
```

### Extend configuration

The `--extends` option allows you to extend the existing configuration. This option accepts one of the following values: `minimal`, `recommended`, `all`. Each of the values is a base set of rules that the lint command will use. You can further modify this set in cases when you want to have your own set of rules based on the existing one, including particular rules that cover your specific needs.

### Format

#### Codeframe (default)

```bash Command
openapi lint --format=codeframe
## equivalent to: openapi lint
```

```bash Output
[1] resources/petstore-with-errors.yaml:16:3 at #/paths/~1pets?id

Don't put query string items in the path, they belong in parameters with `in: query`.

14 |   - name: pets
15 | paths:
16 |   /pets?id:
   |   ^^^^^^^^
17 |     get:
18 |       summary: List all pets

Error was generated by the path-not-include-query rule.
```

Note that the problems are displayed in the following format: `file:line:column`. For example, `petstore-with-errors.yaml:16:3`.

Depending on the terminal emulator you use, it may be possible to directly click this indicator to edit the file in place.

#### Stylish

```bash Command
openapi lint --format=stylish
```

```bash Output
openapi/core.yaml:
  15:7   error    spec                   Property `operationIds` is not expected here.
  22:11  error    spec                   Property `require` is not expected here.
  14:7   warning  operation-operationId  Operation object should contain `operationId` field.
```

In this format, `lint` shows the file name, line number, and column where the problem occurred. However, the output is compressed and omits other contexts and suggestions.

#### Checkstyle

```bash Command
openapi lint --format=checkstyle
```

```bash Output
<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="4.3">
<file name="openapi/core.yaml">
<error line="15" column="7" severity="error" message="Property `operationIds` is not expected here." source="spec" />
<error line="22" column="11" severity="error" message="Property `require` is not expected here." source="spec" />
<error line="14" column="7" severity="warning" message="Operation object should contain `operationId` field." source="operation-operationId" />
</file>
</checkstyle>
```

In this format, `lint` uses the [Checkstyle](https://checkstyle.org/) XML report format.
Due to the limitations of this format, only file name, line, column, severity,
and rule ID (in the `source` attribute) are included. All other information is
omitted.

### Max problems

With the `--max-problems` option, you can limit the number of problems displayed in the command output. If the number of detected problems exceeds the specified threshold, the remaining problems are hidden under the "spoiler message" that lets you know how many problems were hidden.

```bash Command
openapi lint --max-problems 200
```

```bash Output
...
< ... 2 more problems hidden > increase with `--max-problems N`
```

### Generate ignore file

With this option, you can generate the `.redocly.lint-ignore.yaml` file to suppress error and warning severity problems in the output. You will still receive visual feedback to let you know how many problems were ignored.

This option is useful when you have an API design standard, but have some exceptions to the rule (for example, a legacy API operation). It allows for highly granular control.

```shell Command
openapi lint openapi/petstore.yaml --generate-ignore-file
```

```bash Output
...
Generated ignore file with 3 problems.
```

:::warning
This command will overwrite an existing ignore file.
:::

To generate an ignore file for multiple definitions, pass them as arguments:

```bash
openapi lint v1.yaml v2.yaml --generate-ignore-file
```

Example of an ignore file:

```yaml .redocly.lint-ignore.yaml file
# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.
# See https://redocly.com/docs/cli/ for more information.
openapi/petstore:
  spec:
    - '#/paths/~1store/get/operationIds'
    - '#/paths/~1store/get/parameters/0/require'
  operation-operationId:
    - '#/paths/~1store/get'
```

The rule in the example is named `spec`, which indicates compliance with the OpenAPI spec. You can also manually add problems that should be ignored to specific rules.

### Skip preprocessor or rule

You may want to skip specific preprocessors or rules upon running the command.

```bash Skip preprocessors
openapi lint --skip-preprocessor=discriminator-mapping-to-one-of,another-example
```

```bash Skip rules
openapi lint --skip-rule=no-sibling-refs,no-parent-tags
```

:::success Tip
To learn more about preprocessors and rules, refer to the [custom rules](../resources/custom-rules.md) page.
:::
