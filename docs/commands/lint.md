# `lint`

## Introduction

Redocly OpenAPI CLI can identify and report on problems found in OpenAPI definitions. This allows you to avoid bugs and make API definitions more consistent.

The `lint` command reports on problems and executes preprocessors and rules. Unlike the `bundle` command, `lint` doesn't execute decorators.

:::success Tip
To learn more about preprocessors, rules, and decorators, please refer to [this](../custom-rules.md) document.
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

option                   | type      | required?    | default     | description
-------------------------|:---------:|:------------:|:-----------:|------------
`entrypoints`            | `array`   | no           | `[]`        | Array of API definition filenames that need to be linted. (See [the section below](#entrypoints) for more options)
`--config`               | `string`  | no           | -           | Specify path to the config file
`--extends`              | `array`   | no           | -           | Override extends configurations (defaults or config file settings).
`format`                 | `string`  | no           | `codeframe` | Format for the output.<br />**Possible values:** `codeframe`, `stylish`
`--generate-ignore-file` | `boolean` | no           | -           | Generate ignore file
`--help`                 | `boolean` | no           | -           | Show help
`--max-problems`         | `number`  | no           | 100         | Truncate output to display the specified maximum number of problems
`--skip-preprocessor`    | `array`   | no           | -           | Ignore certain preprocessors
`--skip-rule`            | `array`   | no           | -           | Ignore certain rules
`--version`              | `boolean` | no           | -           | Show version number

## Examples

### Entrypoints

The `lint` command behaves differently depending on how you pass entrypoints to it and whether the [configuration file](#custom-configuration-file) exists. There are the following options:

#### Pass entrypoints directly

```bash
openapi lint openapi/openapi.yaml
```

In this case, `lint` will validate the definition(s) that was(were) passed to the command. The configuration file is ignored.

The `entrypoints` argument can also use any glob format supported by your file system. For example, `openapi lint ./root-documents/*.yaml`.

#### Pass entrypoints without extension

You can omit entrypoint's file extension when executing the `lint` command. In this way, you can reference either `.yaml` or `.json` files.

```bash
# lint will validate either petstore.yaml or petstore.json file in the current working directory
openapi lint petstore
# lint will validate either sandbox.yaml or sandbox.json file in the openapi/extra directory
openapi lint openapi/extra/sandbox
```

#### Pass entrypoints via configuration file

Instead of full paths, you can use aliases assigned in your `apiDefinitions` within your `.redocly.yaml` configuration file as entrypoints. For example, `petstore`:

```bash command
openapi lint petstore
```

```yaml .redocly.yaml
apiDefinitions:
  petstore: ./openapi/petstore-definition.json
```

In this case, after resolving the path behind the `petstore` alias (see the `.redocly.yaml` tab), `lint` will validate the `petstore.json` definition file. The presence of the `.redocly.yaml` configuration file is mandatory.

#### Empty entrypoints

You can omit entrypoints completely when executing the `lint` command:

```bash
openapi lint
```

```yaml .redocly.yaml
apiDefinitions:
  petstore: ./openapi/petstore.json
  production: ./openapi/production.yaml
  sandbox: ./openapi/sandbox.yaml
```

In this case, if no API definitions are specified, `lint` will validates all entrypoints listed in the `apiDefinitions` within your `.redocly.yaml` file. The presence of the `.redocly.yaml` configuration file is mandatory.

:::warning Important Note
If you try to execute the `lint` command without specifying entrypoint(s) and your project doesn't have any configuration file  (either `.redocly.yaml` or a custom one specified via the `--config` parameter, see [the section](#custom-configuration-file) below), the `lint` command will throw an error.
:::

### Custom configuration file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
openapi lint --config=./another/directory/config.yaml
```

### Format

#### Codeframe (default)

```bash request
openapi lint --format=codeframe
## equivalent to: openapi lint
```

```bash output
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

Please note that the problems are displayed in the following format: `file:line:column`. For example, `petstore-with-errors.yaml:16:3`.

Depending on the terminal emulator you use, it may be possible to directly click this indicator to edit the file in place.

#### Stylish

```bash request
openapi lint --format=stylish
```

```bash output
openapi/core.yaml:
  15:7   error    spec                   Property `operationIds` is not expected here.
  22:11  error    spec                   Property `require` is not expected here.
  14:7   warning  operation-operationId  Operation object should contain `operationId` field.
```

In this format, `lint` shows the file name, line number, and column where the problem occurred. However, the output is compressed and omits other contexts and suggestions.

### Max problems

With the `--max-problems` option, you can limit the number of problems displayed in the command output. If the number of detected problems exceeds the specified threshold, the remaining problems are hidden under the "spoiler message" that lets you know how many problems were hidden.

```bash request
openapi lint --max-problems 200
```

```bash output
...
< ... 2 more problems hidden > increase with `--max-problems N`
```

### Generate ignore file

With this option, you can generate the `.redocly.lint-ignore.yaml` file that suppresses the severity of errors and warnings in the output. When ignored, you will still be receiving visual feedback to let you know how many problems were ignored.

This option is useful when you have an API design standard, but have some exceptions to the rule (for example, a legacy API operation). It allows for highly granular control.

```shell request
openapi lint openapi/petstore.yaml --generate-ignore-file
```

```bash output
...
Generated ignore file with 3 problems.
```

:::warning
This command will overwrite an existing ignore file
:::

To generate ignore file for multiple definitions, pass them as arguments:

```bash
openapi lint v1.yaml v2.yaml --generate-ignore-file
```

Example of an ignore file:

```yaml .redocly.lint-ignore.yaml file
# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.
# See https://redoc.ly/docs/cli/ for more information.
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
To learn more about preprocessors and rules, please refer to [this](../custom-rules.md) document.
:::
