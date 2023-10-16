# `lint`

## Introduction

Redocly CLI can identify and report on problems found in OpenAPI descriptions. This helps you avoid bugs and make API descriptions more consistent.

The `lint` command reports on problems and executes preprocessors and rules. Unlike the `bundle` command, `lint` doesn't execute decorators.

{% admonition type="success" name="Tip" %}
To learn more about choosing and configuring linting rules to meet your needs, visit the [API standards](../api-standards.md) page.
{% /admonition %}

## Usage

```bash
redocly lint
redocly lint <apis>...
redocly lint [--max-problems=<n>] [--config=<path>] [--format=<value>]
redocly lint [--generate-ignore-file] [--help]
redocly lint --version
```

## Options

| Option                 | Type     | Description                                                                                                                                           |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis                   | [string] | Array of API description filenames that need to be linted. See [the Apis section](#apis) for more options.                                             |
| --config               | string   | Specify path to the [configuration file](#custom-configuration-file).                                                                                 |
| --extends              | [string] | [Extend a specific configuration](#extend-configuration) (defaults or config file settings).                                                          |
| --format               | string   | Format for the output.<br />**Possible values:** `codeframe`, `stylish`, `json`, `checkstyle`, `codeclimate`, `summary`. Default value is `codeframe`. |
| --generate-ignore-file | boolean  | [Generate ignore file](#generate-ignore-file).                                                                                                        |
| --help                 | boolean  | Show help.                                                                                                                                            |
| --lint-config          | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                    |
| --max-problems         | integer  | Truncate output to display the specified [maximum number of problems](#max-problems). Default value is 100.                                           |
| --skip-preprocessor    | [string] | Ignore certain preprocessors. See the [Skip preprocessor or rule section](#skip-preprocessor-or-rule) below.                                          |
| --skip-rule            | [string] | Ignore certain rules. See the [Skip preprocessor or rule section](#skip-preprocessor-or-rule) below.                                                  |
| --version              | boolean  | Show version number.                                                                                                                                  |

## Examples

### <a id="apis"></a>Lint APIs

The `lint` command behaves differently depending on how you pass apis to it and whether the [configuration file](#custom-configuration-file) exists.

#### Pass an API directly

```bash
redocly lint openapi/openapi.yaml
```

In this case, `lint` validates the API description(s) passed to the command. If you have no configuration file defined, the [recommended ruleset](../rules/recommended.md) is used. If you have `extends` or `rules` defined in `redocly.yaml`, those are used when linting.

The `apis` argument can also use any glob format supported by your file system. For example, `redocly lint ./root-documents/*.yaml`.

#### An API from the configuration file

Instead of full paths, you can use names listed in the `apis` section of your Redocly configuration file.
{% tabs %}
{% tab label="Command" %}
```bash
redocly lint core@v1
```
{% /tab  %}
{% tab label="Configuration file" %}
```yaml
apis:
  core@v1:
    root: ./openapi/api-description.json
```
{% /tab  %}
{% /tabs  %}

In this case, after resolving the path behind the `core@v1` name (see the `Configuration file` tab), `lint` validates the `api-description.json` file. The presence of the Redocly configuration file is mandatory.

#### All configured APIs

You can omit apis completely when executing the `lint` command to check all APIs defined in the configuration file.
{% tabs %}
{% tab label="Command" %}
```bash
redocly lint
```
{% /tab  %}
{% tab label="Configuration file" %}
```yaml
apis:
  core@v1:
    root: ./openapi/api-description.json
  production:
    root: ./openapi/production.yaml
  sandbox:
    root: ./openapi/sandbox.yaml
```
{% /tab  %}
{% /tabs  %}
In this case, if no API descriptions are specified, `lint` validates all apis listed under `apis` in your Redocly configuration file. The presence of the configuration file is mandatory.

{% admonition type="warning" name="Important" %}
If you try to execute the `lint` command without apis when your project doesn't have any configuration files, the `lint` command displays an error.
{% /admonition %}

### Custom configuration file

By default, the CLI tool looks for the [Redocly configuration file](../configuration/index.md) in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly lint --config=./another/directory/config.yaml
```

### Extend configuration

The `--extends` option allows you to extend the existing configuration. This option accepts one of the following values: `minimal`, `recommended`, or `all`. Each of the values is a base set of rules that the lint command uses. You can further modify this set in cases when you want to have your own set of rules based on the existing one, including particular rules that cover your specific needs.

{% admonition type="warning" name="Important" %}
When you run the `lint` command without a configuration file, it uses the `extends: [recommended]` by default.
However, if you have a configuration file, but it doesn't include any rules or extends configuration, the `lint` command shows an error.
{% /admonition %}

### Format lint output

The standard codeframe output format works well in most situations, but `redocly` can also produce output to integrate with other tools.

{% admonition type="warning" name="Lint one API at a time" %}
Some formats, such as CheckStyle or JSON, don't work well when mulitple APIs are linted in a single command. Try linting each API separately when you pass the command output to another tool.
{% /admonition %}

#### Codeframe (default)
{% tabs %}
{% tab label="Command" %}
```bash
redocly lint --format=codeframe
## equivalent to: redocly lint
```
{% /tab  %}
{% tab label="Output" %}
```bash
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
{% /tab  %}
{% /tabs  %}
Note that the problems are displayed in the following format: `file:line:column`. For example, `petstore-with-errors.yaml:16:3`.

Depending on the terminal emulator you use, it may be possible to directly click this indicator to edit the file in place.

#### Stylish
{% tabs %}
{% tab label="Command" %}
```bash
redocly lint --format=stylish
```
{% /tab  %}
{% tab label="Output" %}
```bash
openapi/core.yaml:
  15:7   error    spec                   Property `operationIds` is not expected here.
  22:11  error    spec                   Property `require` is not expected here.
  14:7   warning  operation-operationId  Operation object should contain `operationId` field.
```
{% /tab  %}
{% /tabs  %}
In this format, `lint` shows the file name, line number, and column where the problem occurred. However, the output is compressed and omits other contexts and suggestions.

##### JSON

It can be useful to get the output in JSON format to be processed by other tools.
{% tabs %}
{% tab label="Command" %}
```bash
redocly lint --format=json
```
{% /tab  %}
{% tab label="Output" %}
```bash
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
            "ref": "myapi.yaml"
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
            "ref": "myapi.yaml"
          },
          "pointer": "#/paths/~1pathItem/post/operationId",
          "reportOnKey": true
        }
      ],
      "suggest": []
    }
  ]
}
```
{% /tab  %}
{% /tabs  %}
#### Checkstyle

The `lint` command also supports the [Checkstyle](https://checkstyle.org/) XML report format.
{% tabs %}
{% tab label="Command" %}
```bash
redocly lint --format=checkstyle
```
{% /tab  %}
{% tab label="Output" %}
```bash
<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="4.3">
<file name="openapi/core.yaml">
<error line="15" column="7" severity="error" message="Property `operationIds` is not expected here." source="spec" />
<error line="22" column="11" severity="error" message="Property `require` is not expected here." source="spec" />
<error line="14" column="7" severity="warning" message="Operation object should contain `operationId` field." source="operation-operationId" />
</file>
</checkstyle>
```
{% /tab  %}
{% /tabs  %}
Due to the limitations of this format, only file name, line, column, severity,
and rule ID (in the `source` attribute) are included. All other information is
omitted.

### <a id="max-problems"></a>Limit the problem count

With the `--max-problems` option, you can limit the number of problems displayed in the command output. If the number of detected problems exceeds the specified threshold, the remaining problems are hidden under the "spoiler message" that lets you know how many problems were hidden.
{% tabs %}
{% tab label="Command" %}
```bash
redocly lint --max-problems 200
```
{% /tab  %}
{% tab label="Output" %}
```bash
...
< ... 2 more problems hidden > increase with `--max-problems N`
```
{% /tab  %}
{% /tabs  %}
### Generate ignore file

With this option, you can generate the `.redocly.lint-ignore.yaml` file to suppress error and warning severity problems in the output. You still receive visual feedback to let you know how many problems were ignored.

This option is useful when you have an API design standard, but have some exceptions to the rule (for example, a legacy API operation). It allows for highly granular control.
{% tabs %}
{% tab label="Command" %}
```shell
redocly lint openapi/petstore.yaml --generate-ignore-file
```
{% /tab  %}
{% tab label="Output" %}
```bash
...
Generated ignore file with 3 problems.
```
{% /tab  %}
{% /tabs  %}

{% admonition type="warning" %}
This command overwrites an existing ignore file.
{% /admonition %}

To generate an ignore file for multiple API descriptions, pass them as arguments:

```bash
redocly lint v1.yaml v2.yaml --generate-ignore-file
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
{% tabs %}
{% tab label="Skip preprocessors" %}
```bash
redocly lint --skip-preprocessor=discriminator-mapping-to-one-of --skip-preprocessor=another-example
```
{% /tab  %}
{% tab label="Skip rules" %}
```bash
redocly lint --skip-rule=no-sibling-refs --skip-rule=no-parent-tags
```
{% /tab  %}
{% /tabs  %}

{% admonition type="success" name="Tip" %}
To learn more about preprocessors, rules, and decorators, refer to the [custom plugins](../custom-plugins/index.md) page.
{% /admonition %}

### Lint config file

The `lint` command also validates the configuration file. You may want to set severity level by using the `--lint-config` option. This option accepts one of the following values: `warn`,`error`,`off`. Default value is `warn`.
