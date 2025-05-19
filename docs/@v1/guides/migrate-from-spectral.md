# Migrate to Redocly from Spectral

[Spectral](https://stoplight.io/open-source/spectral) offers similar linting capabilities to Redocly CLI and the rest of the Redocly tools. This guide lays out the differences so you can switch tools if you want to.

The first step is to [install Redocly CLI](../installation.md).

## Update command

Replace `spectral lint openapi.yaml` with the equivalent `redocly` command:

```yaml
redocly lint openapi.yaml
```

For more information, check out the [`lint` command documentation](../commands/lint.md).

### Specify ruleset

Instead of `--ruleset`/`-r`, use the `--extends` parameter to indicate which ruleset you are using as a basis.

Read more [about linting and rulesets](../api-standards.md)

### Choose output format

Similar to Spectral, Redocly offers multiple output formats using the `--format` parameter.

### Resolvers

If you use `--resolver` to handle how links and remote URLs are resolved, visit the [configuration documentation](../configuration/index.md#resolve-object) to see how to handle this with Redocly.

## Update configuration

The configuration formats are a little different between the tools.

Redocly uses a configuration file called `redocly.yaml`, the main controls for linting are:

- Specify a [ruleset](../rules.md#rulesets).
- Add configuration for the [rules](../rules.md) accordingly. They can be set to error, warn, or off.
- Expand the collection with any [configurable rules](../rules/configurable-rules.md) that fit your standard.

### Example Redocly configuration file

Below is an example of a `redocly.yaml` configuration file, enabling the [minimal ruleset](../rules/minimal.md), disabling the `security-defined` rule, and setting up an example [configurable rule](../rules/configurable-rules.md) to check for the word "test" appearing in an operation summary.

```yaml
extends:
  - minimal

rules:
  security-defined: off
  rule/naming:
    subject:
      type: Operation
      property: summary
    assertions:
      notPattern: /test/
    message: "Operation summary must not include the word test"
```

It is also possible to configure additional rules for specific APIs using the [APIs object](../configuration/index.md#apis-object) to set per-API rules (or exceptions!).

### Redocly rules and Spectral equivalents

Included here is an attempt to map the simliar-but-not-identical naming of rules between the tools. If you spot anything that needs adding or updating, please [tell us](https://github.com/redocly/redocly-cli/issues)?

| Spectral rules                         | Redocly rules                                 |
| -------------------------------------- | --------------------------------------------- |
| `duplicated-entry-in-enum`             |                                               |
| `info-contact`                         | `info-contact`                                |
| `info-description`                     |                                               |
| `info-license`                         | `info-license`                                |
| `license-url`                          | `info-license-url`                            |
| `no-$ref-siblings`                     |                                               |
| `no-eval-in-markdown`                  |                                               |
| `no-script-tags-in-markdown`           |                                               |
| `oas3-api-servers`                     | `no-empty-servers`                            |
| `oas3-examples-value-or-externalValue` | `no-example-value-and-externalValue`          |
| `oas3-operation-security-defined`      | `security-defined`                            |
| `oas3-parameter-description`           | `parameter-description`                       |
| `oas3-schema`                          | `spec`                                        |
| `oas3-server-not-example.com`          | `no-server-example.com`                       |
| `oas3-server-trailing-slash`           | `no-server-trailing-slash`                    |
| `oas3-unused-component`                | `no-unused-components`                        |
| `oas3-valid-media-example`             | `no-invalid-media-type-examples`              |
| `oas3-valid-schema-example`            | `no-invalid-schema-examples`                  |
| `openapi-tags`                         |                                               |
| `openapi-tags-alphabetical`            | `tags-alphabetical`                           |
| `openapi-tags-uniqueness`              |                                               |
| `operation-description`                | `operation-description`                       |
| `operation-operationId`                | `operation-operationId`                       |
| `operation-operationId-unique`         | `operation-operationId-unique`                |
| `operation-operationId-valid-in-url`   | `operation-operationId-url-safe`              |
| `operation-parameters`                 | `operation-parameters-unique`                 |
| `operation-singular-tag`               | `operation-singular-tag`                      |
| `operation-success-response`           | `operation-2xx-response`                      |
| `operation-tag-defined`                | `operation-tag-defined`                       |
| `operation-tags`                       |                                               |
| `path-declarations-must-exist`         | `path-declaration-must-exist`                 |
| `path-keys-no-trailing-slash`          | `no-path-trailing-slash`                      |
| `path-not-include-query`               | `path-not-include-query`                      |
| `path-params`                          | `path-parameters-defined`                     |
| `tag-description`                      | `tag-description`                             |
| `typed-enum`                           |                                               |
|                                        | `boolean-parameter-prefixes`                  |
|                                        | `no-ambiguous-paths`                          |
|                                        | `no-enum-type-mismatch`                       |
|                                        | `no-http-verbs-in-paths`                      |
|                                        | `no-identical-paths`                          |
|                                        | `no-invalid-parameter-examples`               |
|                                        | `no-server-variables-empty-enum`              |
|                                        | `no-undefined-server-variable`                |
|                                        | `no-unresolved-refs`                          |
|                                        | `operation-4xx-problem-details-rfc7807`       |
|                                        | `operation-4xx-response`                      |
|                                        | `operation-summary`                           |
|                                        | `path-excludes-patterns`                      |
|                                        | `path-segment-plural`                         |
|                                        | `paths-kebab-case`                            |
|                                        | `request-mime-type`                           |
|                                        | `required-string-property-missing-min-length` |
|                                        | `response-contains-header`                    |
|                                        | `response-contains-property`                  |
|                                        | `response-mime-type`                          |
|                                        | `scalar-property-missing-example`             |
|                                        | `spec-components-invalid-map-name`            |

### Configurable and extensible rules

If the built-in rules don't meet your requirements, don't worry! Redocly allows you to build any rule to meet your needs, using [configurable rules](../rules/configurable-rules.md). Declare which elements of the OpenAPI description should comply with the rule, and then define the criteria that it should be checked against.

Build up the rulesets that work for your organization's API standards. These can be:

- using existing Redocly rulesets
- defining your own rulesets from built-in, configurable and/or custom rules
- combining rulesets from any source
- adding per-API additions or exceptions as required
- using an ignore file to overlook existing/historic incompatibilities while still enforcing rules for changed elements

For some advanced use cases, the configurable rules can't cover all possibilities. If that happens, Redocly supports [adding rules in custom plugins](../custom-plugins/custom-rules.md) so that you can use JavaScript to express any specialist rules you need.

## Explore tool functionality

Redocly CLI supports multiple Redocly products and functions, so go ahead and [read more about Redocly CLI](../index.md).
