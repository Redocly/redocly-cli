# `lint`

## Introduction

One of the most powerful features of Redocly CLI is its ability to identify problems found in OpenAPI definitions. This is achieved with the `lint` command, which helps your definitions conform to a consistent set of rules.

The `lint` command ensures that your definition file structure is valid (according to the OpenAPI Specification and your own custom rules, if any) and contains no errors. It also executes preprocessors and rules.

:::warning Important
Unlike the `bundle` command, `lint` doesn't execute decorators. To learn more about preprocessors and rules, see the [custom rules](../resources/custom-rules.md) page.
:::

## Options

Always the over-achiever, `lint` has many options which you can execute alone, or combine with others in a single command:

```bash Standalone
redocly lint
redocly lint <entrypoints>...
redocly lint --config=<path>
redocly lint --extends=<value>
redocly lint --format=<value>
redocly lint --generate-ignore-file
redocly lint --help
redocly lint --max-problems=<n>
redocly lint --skip-preprocessor=<preprocessor>
redocly lint --skip-rule=<rule>,<rule>
redocly lint --version
```

```bash Combined
redocly lint [--max-problems=<n>] [--config=<path>] [--format=<value>]
```

| Option | Type | Description |
|---|---|---|
| entrypoints | array | [Sets the entrypoints](#how-to-use-entrypoints-to-check-all-or-selected-definitions) (locations) of specific definition files to lint. If no entrypoints are provided, all the APIs defined in the Redocly configuration file are linted. |
| --config | string | Lets you [specify a path to a custom config file](#how-to-reference-a-custom-config-file). |
| --extends | array | [Extends the existing configuration](#how-to-activate-rule-sets). |
| --format | string | [Applies formatting to the output](#how-to-format-linting-results). Possible values: `codeframe`, `stylish`, `json`, `checkstyle`. Default: `codeframe`. |
| --generate-ignore-file | boolean | [Generates an ignore file](#how-to-ignore-specific-errors-and-warnings) which tells Redocly CLI to ignore certain warnings/errors when validating the definition. |
| --help | boolean | [Displays a short help menu](#how-to-open-the-help), showing lint options. |
| --max-problems | integer | [Truncates the output](#how-to-limit-issues-shown-in-the-output) to show only a specified number of errors and warnings. Default: `100`. |
| --skip-preprocessor | array | [Ignores specific preprocessors](#how-to-skip-a-rule-or-preprocessor-during-linting). |
| --skip-rule | array | [Ignores specific rules](#how-to-skip-a-rule-or-preprocessor-during-linting). |
| --version | boolean | Adding `--version` to any command (not just `lint`) will show your current Redocly CLI version. |

## Examples

### How to use entrypoints to lint all or selected definitions

##### Method 1: Pass entrypoints directly
In this case, `lint` will validate the definitions passed in the command and ignore the `apis` object in the Redocly configuration file.

```bash
redocly lint openapi/openapi.yaml
```

The `entrypoints` argument can also use any glob format supported by your file system. For example, `redocly lint ./root-documents/*.yaml`.

##### Method 2: Pass entrypoints via the config file

The `apis` object in the Redocly configuration file (`redocly.yaml`) lets you configure one or more APIs. Each file path is specified (using the `root` property), but files are identified by their name and version in the format `name@version`.

`@version` is optional, and when not provided, Redocly apps interpret it as `latest` by default. Every `name@version` combination listed in the `apis` section must be unique.

You can pass `name@version` in commands like `lint` and `stats` to act only on those APIs. Below is an example `apis` object showing three files identified using `core@latest`, `production@v1` and `sandbox@v1`:

```yaml Configuration file
apis:
  core@latest:
    root: ./openapi.yaml
  production@v1:
    root: ./production.yaml
  sandbox@v1:
    root: ./sandbox.yaml
```

 In this example, we only want to lint the `core@latest` API:

```bash Command
redocly lint core@latest
```

##### Method 3: Pass no entrypoints

Running `lint` without specifying a particular API definition checks all APIs in your configuration file.

```bash
redocly lint
```

:::warning Important
If you run `redocly lint` without entrypoints, and your project has no configuration files, you'll get an error.
:::

### How to reference a custom config file

By default, Redocly CLI looks for the [Redocly configuration file](/docs/cli/configuration/configuration-file.mdx) in the current working or project directory. Using the optional `--config` argument provides an alternative path to a different configuration file if one exists.

```bash
redocly lint --config=./another/directory/anotherconfig.yaml
```

### How to activate rule sets

Redocly CLI comes with [built-in rules](./resources/built-in-rules.md) that are used to validate API definitions.

An alternative approach is to use **rule configurations** to quickly invoke a lot of rules at the same time.

Redocly CLI has three built-in rule configurations, each specifying different levels of severity, that can be used to validate API definitions by adding the `--extends` option to the `lint` command:

* For you rebels out there, the `minimal` configuration will apply the least severe config for each built-in rule, and deactivate others entirely. We like to call this our death-metal rule set. View the GitHub Source [here](https://github.com/Redocly/openapi-cli/blob/ed997e2586e7adb7e32d8107cac79c452891f765/packages/core/src/config/minimal.ts).
* Late 80s easy-listening more your jam? Then our `recommended` configuration is for you. It will apply the recommended config for each built-in rule. View the GitHub source [here](https://github.com/Redocly/openapi-cli/blob/ed997e2586e7adb7e32d8107cac79c452891f765/packages/core/src/config/recommended.ts).
* Got Gregorian chants playing on loop? The `all` configuration will satisfy your need for strictness. All rules are on, and `lint` will return an error if your API definition is anything less than perfect. View the GitHub source [here](https://github.com/Redocly/openapi-cli/blob/e6f99e57da339d89bba7f4a1ba897282d7cebbd2/packages/core/src/config/all.ts).

When you compare the source files, you will see that some rules are switched on, some are set to different severities, and some are switched off. Here's how to activate each rule configuration when linting your API definitions:

```bash
redocly lint --extends=minimal
```

```bash
redocly lint --extends=recommended
```

```bash
redocly lint --extends=all
```

### How to format linting results

##### Codeframe

This format returns linting results in codeframe format.

```bash Command
redocly lint --format=codeframe
redocly lint mydefinition.yaml --format=codeframe
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
run `redocly lint --generate-ignore-file` to add all problems to the ignore file.
```

Note that any problems detected are displayed in the following format: `file:line:column`. For example, `mydefinition.yaml:168:7`. Depending on the terminal you use, it may be possible to click this and edit the file.

##### Stylish

In this format, `lint` returns the file name, line number and column where the problem occurred, all in a nice table format. Note that stylish output is compressed and doesn't include contexts or suggestions.

```bash Command
redocly lint --format=stylish
redocly lint mydefinition.yaml --format=stylish
```

```bash Output
mydefinition.yaml:
  168:7  error    spec                   Property `operationIdentifier` is not expected here.
  162:5  warning  operation-operationId  Operation object should contain `operationId` field.

mydefinition.yaml: validated in 62ms

❌ Validation failed with 1 error and 1 warning.
run `redocly lint --generate-ignore-file` to add all problems to the ignore file.
```

##### json
No surprises here. `lint` returns results in JSON format.

```bash Command
redocly lint --format=json
redocly lint mydefinition.yaml --format=json
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
run `redocly lint --generate-ignore-file` to add all problems to the ignore file.
```

##### Checkstyle

In this format, `lint` uses the [Checkstyle](https://checkstyle.org/) XML report format. This format only includes file name, line, column, severity, and rule ID (in the `source` attribute). All other information is left out.

```bash Command
redocly lint --format=checkstyle
redocly lint mydefinition.yaml --format=checkstyle
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
run `redocly lint --generate-ignore-file` to add all problems to the ignore file.
```

### How to ignore specific errors and warnings

While you are busy linting your definition file, you can use the `--generate-ignore-file` option to create the Redocly ignore file.

`.redocly.lint-ignore.yaml` tells Redocly CLI to ignore certain warnings/errors when validating the definition. You will still be shown how many problems were ignored, but your definition will validate regardless.

For example, say you have a rule that states "all parameter names must be lowercase", but in one of your operations, one special parameter breaks this rule. You want to keep this rule enabled in general, but in this one case add it as an exception. That's where the `.redocly.lint-ignore.yaml` file comes in. It stores the exception, so the next time you run `lint`, that parameter is detected but ignored.

:::warning
The existing `.redocly.lint-ignore.yaml` file will be replaced each time the `--generate-ignore-file` option is run.
:::

```bash Command
redocly lint openapi/mydefinition.yaml --generate-ignore-file
```

```bash Output
...
Generated ignore file with 2 problems.
```

To generate an ignore file for multiple definitions, pass them as arguments in the command:

```bash
redocly lint v1.yaml v2.yaml --generate-ignore-file
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

### How to open the help

This option works with any command, not just `lint`.

```bash Command
redocly lint --help
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

### How to limit issues shown in the output

This option lets you limit the number of detected issues (errors and warnings) shown in the output. If issues go over the threshold, the overflow is hidden in a spoiler.

```bash Command
redocly lint --max-problems 125
redocly lint mydefinition.yaml --max-problems 125
```

```bash Output
...
< ... 2 more problems hidden > increase with `--max-problems N`
```

### How to skip a rule or preprocessor during linting

You can use `--skip-rule` to ignore any [custom rules](./resources/custom-rules.md) or [built-in rules](./resources/built-in-rules.md). In this example, we will skip the `spec` and `operation-4xx-response` built-in rules:

```bash
redocly lint openapi.yaml --skip-rule=spec --skip-rule=operation-4xx-response
```

Want to know how to skip a preprocessor? Because we don't recommend using preprocessors, you'll understand why we're choosing to skip that advice.