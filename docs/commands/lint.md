# `lint`

## Why you need it

One of the most powerful features of Redocly OpenAPI CLI is its ability to identify problems found in OpenAPI definition files. This is achieved through the `lint` command, which helps your definitions conform to a consistent set of rules.

The `lint` command ensures that your definition file structure is valid (according to the OpenAPI Specification and your own custom rules, if any) and contains no errors. It also executes preprocessors and rules (unlike the `bundle` command, `lint` doesn't execute decorators). To learn more about preprocessors and rules, see the [custom rules](../resources/custom-rules.md) page.

Always the over-achiever, `lint` has options which you can execute alone, or combine with others:

```bash
openapi lint
openapi lint <entrypoints>...
openapi lint [--max-problems=<n>] [--config=<path>] [--format=<value>]
openapi lint [--generate-ignore-file] [--help]
openapi lint --version
```

Each option is discussed in detail below, and examples are also provided.

## How to run the `lint` command
In your terminal, cd to the root of your project directory, then type the command along with any of the options described below.

## How to check all or selected definitions

| Option         |  Type  |   Required   | Default |
|----------------|------|------------|-------|
|`<entrypoints>` | `array` | optional     |   none  |

Lets you pass the entrypoints (locations) of specific definition files in the command so `lint` only checks those files. There are several ways to do this.

### Method 1: Pass entrypoints directly
In this case, `lint` will validate the definitions passed in the command and ignore the `apis` section in `redocly.yaml` or any other customized config file you may be using.

```bash
openapi lint openapi/openapi.yaml
```

The `entrypoints` argument can also use any glob format supported by your file system. For example, `openapi lint ./root-documents/*.yaml`.

### Method 2: Pass entrypoints via the config file

The `apis` section in the Redocly configuration file (`redocly.yaml`) lets you configure one or more API definitions. Each file path is specified (using the `root` property), but files are identified by their name and version in the format `name@version`.

`@version` is optional. It allows you to derive multiple API definitions from the same root file. When a version is not provided, Redocly apps interpret a file as being the `latest` version. Every `name@version` combination listed in the `apis` section must be unique.

You can pass `name` or `name@version` in commands like `lint` and `stats` to act only on the files using those aliases. Below is an example `apis` section showing three files identified using `main`, `production` and `sandbox`:

```yaml Configuration file
apis:
  main:
    root: ./openapi.yaml
    labels:
      - main
    lint: []
    features.openapi: []
  production:
    root: ./production.yaml
    labels:
      - production
    lint: []
    features.openapi: []
  sandbox:
    root: ./sandbox.yaml
    labels:
      - sandbox
    lint: []
    features.openapi: []
```

 In this example, we only want to validate files under `main`:

```bash Command
openapi lint main
```

### Method 3: Pass no entrypoints

Running `lint` without specifying a particular OpenAPI definition file checks all definition files in your project directory.

```bash
openapi lint
```

:::warning Important
If you run `openapi lint` without entrypoints, and your project has no configuration files, you'll get an error.
:::

## How to reference a custom config file

| Option     |   Type   |   Required   | Default |
|------------|--------|------------|-------|
| `--config` | `string` | optional     |   none  |

By default, OpenAPI CLI looks for the [Redocly configuration file](/docs/cli/configuration/configuration-file.mdx) in the current working or project directory. Using the optional `--config` argument provides an alternative path to a different configuration file if one exists.

```bash
openapi lint --config=./another/directory/anotherconfig.yaml
```

## How to activate rule sets

| Option      |   Type  | Required | Values                          |    Default    |
|-------------|-------|--------|---------------------------------|-------------|
| `--extends` | `array` | optional | `minimal`, `recommended`, `all` | `recommended` |

OpenAPI CLI comes with [built-in rules](./resources/built-in-rules.md) that are used to validate API definitions. If you want to override any rule or reduce its severity, you can do so by modifying `redocly.yaml` (globally or per API definition).

An alternative approach is to use **rule sets** to quickly invoke a lot of rules at the same time.

OpenAPI CLI has three rule sets, each specifying different levels of severity, that can be applied to API definition file validation using the `--extends` option in the `lint` command:

* For you rebels out there, the `minimal` rule set will apply the least severe config for each built-in rule, and deactivate others entirely. We like to call this our death-metal rule set. View the GitHub Source [here](https://github.com/Redocly/openapi-cli/blob/ed997e2586e7adb7e32d8107cac79c452891f765/packages/core/src/config/minimal.ts).
* Late 80s easy-listening more your jam? Then our `recommended` rule set is for you. It will apply the recommended config for each built-in rule. View the GitHub source [here](https://github.com/Redocly/openapi-cli/blob/ed997e2586e7adb7e32d8107cac79c452891f765/packages/core/src/config/recommended.ts).
* Got Gregorian chants playing on loop? The `all` rule set will satisfy your need for strictness. All rules are on, and `lint` will return an error if your API definition is anything less than perfect. View the GitHub source [here](https://github.com/Redocly/openapi-cli/blob/e6f99e57da339d89bba7f4a1ba897282d7cebbd2/packages/core/src/config/all.ts).

When you compare the source files, you will see that some rules are switched on, some are set to different severities, and some are switched off. Here's how to activate each rule set when linting your API definitions:

```bash
openapi lint --extends=minimal
```

```bash
openapi lint --extends=recommended
```

```bash
openapi lint --extends=all
```

## How to format linting results

| Option     |   Type   | Required | Values                                       |   Default   |
|------------|--------|--------|----------------------------------------------|-----------|
| `--format` | `string` | optional | `codeframe`, `stylish`, `json`, `checkstyle` | `codeframe` |

### Codeframe

This format returns linting results in codeframe format.

```bash Command
openapi lint --format=codeframe
openapi lint mydefinition.yaml --format=codeframe
```

```bash Output
[1] mydefinition.yaml:168:7 at #/paths/~1pathItem/post/operationIdentifier

Property `operationIdentifier` is not expected here.

166 | description: |
167 |   Operation description **Markdown**.
168 | operationIdentifier: operationId
169 | security:
170 |   - api_key: []

Error was generated by the spec rule.

[2] mydefinition.yaml:162:5 at #/paths/~1pathItem/post/operationId

Operation object should contain `operationId` field.

160 |         source: "$form = new \\API\\Entities\\Echo();\r\n$form->setMessage(\"Hello World!\");\r\ntry {\r\n    $pet = $clie...<97 chars>
161 | /pathItem:
162 |   post:
163 |     tags:
164 |       - Tag

Warning was generated by the operation-operationId rule.

mydefinition.yaml: validated in 64ms

❌ Validation failed with 1 error and 1 warning.
run `openapi lint --generate-ignore-file` to add all problems to the ignore file.
```

Note that the problems detected are displayed in the following format: `file:line:column`. For example, `mydefinition.yaml:168:7`. Depending on the terminal emulator you use, it may be possible to directly click this and edit the file.

### Stylish

In this format, `lint` returns the file name, line number and column where the problem occurred, all in a nice table format. Note that stylish output is compressed and doesn't include contexts or suggestions.

```bash Command
openapi lint --format=stylish
openapi lint mydefinition.yaml --format=stylish
```

```bash Output
mydefinition.yaml:
  168:7  error    spec                   Property `operationIdentifier` is not expected here.
  162:5  warning  operation-operationId  Operation object should contain `operationId` field.

mydefinition.yaml: validated in 62ms

❌ Validation failed with 1 error and 1 warning.
run `openapi lint --generate-ignore-file` to add all problems to the ignore file.
```

### json
In this format. `lint` returns results in JSON format.

```bash Command
openapi lint --format=json
openapi lint mydefinition.yaml --format=json
```

```bash Output
validating mydefinition.yaml...
{
  "totals": {
    "errors": 1,
    "warnings": 1,
    "ignored": 0
  },
  "version": "1.0.0-beta.84",
  "problems": [
    {
      "ruleId": "spec",
      "severity": "error",
      "message": "Property `operationIdentifier` is not expected here.",
      "suggest": [],
      "location": [
        {
          "source": {
            "ref": "mydefinition.yaml"
          },
          "pointer": "#/paths/~1pathItem/post/operationIdentifier",
          "reportOnKey": true
        }
      ]
    },
    {
      "ruleId": "operation-operationId",
      "severity": "warn",
      "message": "Operation object should contain `operationId` field.",
      "location": [
        {
          "source": {
            "ref": "mydefinition.yaml"
          },
          "pointer": "#/paths/~1pathItem/post/operationId",
          "reportOnKey": true
        }
      ],
      "suggest": []
    }
  ]
}mydefinition.yaml: validated in 52ms

❌ Validation failed with 1 error and 1 warning.
run `openapi lint --generate-ignore-file` to add all problems to the ignore file.
```

### Checkstyle

In this format, `lint` uses the [Checkstyle](https://checkstyle.org/) XML report format. This format only includes file name, line, column, severity, and rule ID (in the `source` attribute). All other information is left out.

```bash Command
openapi lint --format=checkstyle
openapi lint mydefinition.yaml --format=checkstyle
```

```bash Output
validating mydefinition.yaml...
<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="4.3">
<file name="mydefinition.yaml">
<error line="168" column="7" severity="error" message="Property `operationIdentifier` is not expected here." source="spec" />
<error line="162" column="5" severity="warning" message="Operation object should contain `operationId` field." source="operation-operationId" />
</file>
</checkstyle>
mydefinition.yaml: validated in 52ms

❌ Validation failed with 1 error and 1 warning.
run `openapi lint --generate-ignore-file` to add all problems to the ignore file.
```

## How to ignore specific errors and warnings

| Option                   |    Type   |   Required   | Default |
|--------------------------|---------|------------|-------|
| `--generate-ignore-file` | `boolean` | optional     |  none  |

While you are busy linting your definition file, you can use this option to create the Redocly ignore file.

`.redocly.lint-ignore.yaml` tells OpenAPI CLI to ignore certain warnings/errors when validating the definition. You will still be shown how many problems were ignored, but your definition will validate regardless.

For example, say you have a rule that states "all parameter names must be lowercase", but in one of your operations, one special parameter breaks this rule. You want to keep this rule enabled in general, but in this one case add it as an exception. That's where the `.redocly.lint-ignore.yaml` file comes in. It stores the exception, so the next time you run `lint`, that parameter is detected but ignored.

:::warning
The existing `.redocly.lint-ignore.yaml` file will be replaced each time the `lint` command containing this option is run.
:::

```bash Command
openapi lint openapi/mydefinition.yaml --generate-ignore-file
```

```bash Output
...
Generated ignore file with 2 problems.
```

To generate an ignore file for multiple definitions, pass them as arguments in the command:

```bash
openapi lint v1.yaml v2.yaml --generate-ignore-file
```

Example of an ignore file:
```yaml .redocly.lint-ignore.yaml file
# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.
# See https://redoc.ly/docs/cli/ for more information.
mydefinition.yaml:
  spec:
    - '#/paths/~1pathItem/post/operationIdentifier'
  operation-operationId:
    - '#/paths/~1pathItem/post/operationId'
```

The built-in rule in our example is `spec`, which indicates compliance with the OpenAPI Specification. You can also manually add to specific rules problems that should be ignored.

## How to open the help

| Option   |    Type   |   Required   |   Default   |
|----------|---------|------------|-----------|
| `--help` | `boolean` | optional     |    none     |

Displays a short help menu, showing lint options.

```bash Command
openapi lint --help
```

```
cli.js lint [entrypoints...]

Lint definition.

Positionals:
  entrypoints                                              [array] [default: []]

Options:
  --version               Show version number.                         [boolean]
  --help                  Show help.                                   [boolean]
  --format                Use a specific output format.
  [choices: "stylish", "codeframe", "json", "checkstyle"] [default: "codeframe"]
  --max-problems          Reduce output to max N problems.
                                                         [number] [default: 100]
  --generate-ignore-file  Generate ignore file.                        [boolean]
  --skip-rule             Ignore certain rules.                          [array]
  --skip-preprocessor     Ignore certain preprocessors.                  [array]
  --config                Specify path to the config file.              [string]
  --extends               Override extends configurations (defaults or config
                          file settings).                                [array]
```

## How to limit issues shown in the results

| Option           |   Type   |   Required   | Default |
|------------------|--------|------------|-------|
| `--max-problems` | `number` | optional     |   100   |

This option lets you limit the number of detected issues (errors and warnings) shown in the output. If issues go over the threshold, the overflow is hidden in a spoiler.

```bash Command
openapi lint --max-problems 125
openapi lint mydefinition.yaml --max-problems 125
```

```bash Output
...
< ... 2 more problems hidden > increase with `--max-problems N`
```

## How to skip a rule during linting

| Option                |   Type  |   Required   |   Default   |
|-----------------------|-------|------------|-----------|
| `--skip-rule`         | `array` | optional     | none        |

You can use `--skip-rule` to ignore any [custom rules](./resources/custom-rules.md) or [built-in rules](./resources/built-in-rules.md). In this example, we will skip the `spec` and `operation-4xx-response` built-in rules:

```bash
openapi lint openapi.yaml --skip-rule=spec --skip-rule=operation-4xx-response
```

Want to know how to skip a preprocessor? Because we don't recommend using preprocessors, forgive us if we skip that advice.

## How to view the current OpenAPI CLI version
Adding `--version` to any command (not just `lint`) will show the current version.