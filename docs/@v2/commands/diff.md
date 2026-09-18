# `diff`

## Introduction

{% admonition type="warning" name="Important" %}
The `diff` command is considered an experimental feature.
This means it's still a work in progress and may go through major changes, including its output formats and rule ids.
{% /admonition %}

The `diff` command compares two API descriptions.
It reports what you added, removed, and changed.
For OpenAPI 3.x and AsyncAPI 3 it also marks each change as breaking or non-breaking.
Use it to find a breaking change before your consumers do.

## Usage

```bash
redocly diff <base> <revision>
redocly diff v1/openapi.yaml v2/openapi.yaml
redocly diff https://example.com/openapi.yaml openapi.yaml --format=json
redocly diff main@v1 main@v2 --fail-on=breaking
```

## Options

| Option        | Type    | Description                                                                                                                                                                                           |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| base          | string  | **REQUIRED.** Path, URL, or config alias of the base (older) API description.                                                                                                                         |
| revision      | string  | **REQUIRED.** Path, URL, or config alias of the revision (newer) API description.                                                                                                                     |
| --config      | string  | Specify path to the [configuration file](../configuration/index.md).                                                                                                                                  |
| --fail-on     | string  | Exit with code `1` when changes at this level are found. <br /> **Possible values:** `breaking`, `none`. Default value is `breaking`.                                                                 |
| --format      | string  | Format for the output. <br /> **Possible values:** `stylish`, `json`, `markdown`, `html`, `codeframe`, `checkstyle`, `codeclimate`, `summary`, `github-actions`, `junit`. Default value is `stylish`. |
| --help        | boolean | Show help.                                                                                                                                                                                            |
| --lint-config | string  | Specify the severity level for the configuration file. <br /> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                   |
| --output, -o  | string  | Write the report to a file instead of stdout. Supported by the `stylish`, `json`, `markdown`, and `html` formats.                                                                                     |
| --version     | boolean | Show version number.                                                                                                                                                                                  |

## How it works

- The command bundles both descriptions.
  This resolves every external `$ref` before the comparison starts.
- Some list items have a natural identity.
  For example, a parameter is identified by its `in` and `name` values.
  The command matches these items by that identity, so a different order is not a change.
- The command reports a change to a shared component once, at the location of the component.
  To decide if that change is breaking, the command looks at where you use the component: in requests, in responses, or in both.
- If the command finds a change that it cannot judge, it reports `breaking`.
  A `$ref` that points to a different target is such a change.
- The command compares the structure of every specification type that Redocly CLI supports.
  It marks changes as breaking or non-breaking for OpenAPI 3.x and AsyncAPI 3.
- The API sends the requests under `callbacks` and `webhooks`, so the direction below those keys is the opposite one.
  The command judges their request body the way it judges a response.
  It judges their responses the way it judges a request.
- AsyncAPI 3 declares the direction instead of implying it from the position:
  - An operation with `action: receive` gets the message from another application.
    The command judges its payload the way it judges a request body.
  - An operation with `action: send` produces the message.
    The command judges its payload the way it judges a response.
  - A `reply` travels in the opposite direction.
  - A channel takes its direction from the operations that reference it.

{% admonition type="info" name="Limitations" %}
The command finds the common breaking changes that the rule catalog below describes.
It does not find every possible breaking change.

If you rename a component, such as a schema or a parameter, the command reports a removal and an addition.
It does not match the new component to the old one.
The report marks the new `$ref` target as `breaking` with the rule `ref-target-changed`.

The command cannot compare two documents from different specification families, such as OpenAPI 2.0 and OpenAPI 3.1.

The subschemas inside `allOf`, `oneOf`, and `anyOf` have no natural identity.
The command matches them by position, so a different order can read as a change.

`readOnly` and `writeOnly` do not refine the direction.
If you use a component in a request and in a response, the command judges it under both directions and keeps the more severe verdict.

Items that do have an identity, such as `servers` matched by URL, keep their verdict when you reorder them.
The command reports no change, although the order of `servers` can carry a meaning.

A comparison between OpenAPI 3.0 and OpenAPI 3.1 can report differences that are only syntax.
For example, `nullable: true` and `type: [..., "null"]` describe the same schema.

In AsyncAPI 3, a channel that no operation references has no direction.
The command reports the changes to its payload without a breaking verdict.

In AsyncAPI 3, the command compares channel parameters, bindings, and `securitySchemes`, but no rule judges them yet.
{% /admonition %}

## Breaking change rules

### OpenAPI 3.x

| Rule id                           | Description                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `additional-properties-changed`   | The `additionalProperties` value decides which extra properties an object accepts.                        |
| `enum-values-added`               | Adding enum values to response data may send clients values they never handled.                           |
| `enum-values-removed`             | Removing enum values restricts what clients may send.                                                     |
| `media-type-removed`              | Removing a media type breaks clients that produce or consume it.                                          |
| `numeric-range-changed`           | Moving a numeric bound changes which values the API accepts or returns.                                   |
| `operation-removed`               | Removing an operation breaks all of its consumers.                                                        |
| `parameter-added-required`        | Adding a new required parameter breaks clients that do not send it.                                       |
| `parameter-became-required`       | Marking an existing request parameter as required breaks clients that omit it.                            |
| `parameter-removed`               | Removing a request parameter breaks clients that send it.                                                 |
| `parameter-serialization-changed` | Changing how a parameter is serialized breaks clients that encode it the old way.                         |
| `path-removed`                    | Removing a path breaks all consumers of its operations.                                                   |
| `property-removed-from-response`  | Removing a response property breaks clients that read it.                                                 |
| `ref-target-changed`              | The `$ref` points to a different target. The diff cannot check that the new target is equivalent.         |
| `request-body-became-required`    | Requiring a body that used to be optional breaks clients that send none.                                  |
| `request-body-removed`            | When the request body is removed, the API no longer reads the data that clients send.                     |
| `required-properties-added`       | Requiring new request properties breaks clients that do not send them.                                    |
| `required-properties-removed`     | A response property that is no longer required can be absent, which breaks clients that read it.          |
| `response-header-removed`         | Removing a response header breaks clients that read it.                                                   |
| `response-removed`                | Removing a response breaks clients that handle it.                                                        |
| `schema-combinator-changed`       | Adding or dropping a subschema changes which shapes the API accepts.                                      |
| `schema-format-changed`           | A format constrains the accepted values beyond the type itself.                                           |
| `schema-type-changed`             | A narrower type rejects values that clients send. A wider type returns values that clients do not handle. |
| `security-requirement-added`      | Requiring authentication where there was none breaks every existing client.                               |
| `security-scheme-changed`         | Changing how a scheme authenticates breaks clients that implemented the old way.                          |
| `security-scheme-removed`         | Removing a scheme leaves clients with no way to authenticate through it.                                  |
| `security-scopes-added`           | A new required scope breaks clients whose credentials do not include it.                                  |
| `string-length-changed`           | Changing a string constraint changes which values the API accepts or returns.                             |

### AsyncAPI 3

An AsyncAPI 3 payload is a schema, so every schema rule above also applies to it.
The direction comes from the `action` value of the operation.
The command also runs `operation-removed` and `ref-target-changed` for AsyncAPI 3.
These rules apply to AsyncAPI 3 only:

| Rule id                        | Description                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `channel-address-changed`      | The address is what clients publish to and subscribe on.                         |
| `channel-removed`              | Removing a channel leaves its publishers and subscribers with nowhere to go.     |
| `message-content-type-changed` | A message in another content type cannot be decoded by existing clients.         |
| `message-removed`              | Removing a message breaks every application that sends or receives it.           |
| `operation-action-changed`     | Swapping send and receive reverses which side of the channel the API is on.      |
| `server-removed`               | Removing a server leaves clients connected to a host that no longer serves them. |

## Verdicts

Each change carries every verdict that a rule gave it, in a `verdicts` array.
A verdict has three fields:

- `ruleId`: the rule that gave the verdict, for example `parameter-became-required`
- `compat`: the classification, either `breaking` or `non-breaking`
- `message`: one sentence that says what the change does

More than one rule can judge the same change.
The `compat` field of the change itself holds the most severe of those verdicts.
Every output format shows that field.

### Locations

Each change reports the file, the line, and the column of the affected node on both sides: `base` and `revision`.

The `stylish` format groups the changes per operation, for example `GET /pets`.
Each change carries one `file:line:col` reference that you can click.
The reference points to the base file for a removal, and to the revision file for every other change.

A description can span several files.
If the command pulled a node in through a `$ref` to another file, the reference points to line `1`, column `1` of the root file.

### Path parameter renaming

If you rename a path parameter, for example from `/pets/{id}` to `/pets/{petId}`, the command treats the path as the same endpoint.
It does not report a removal and an addition.
The report holds two non-breaking changes: one for the path template, and one for the `name` of the parameter.

If more than one path differs only in the name of a parameter, the match is ambiguous.
The command then compares those paths by their literal keys.

A renamed path can hold operations with `callbacks`.
If a path item inside such a callback declares a parameter with the name you renamed, the report can show that callback parameter as removed and added.
This is a structural change in the report only, not a change to your API.

## Examples

### Fail a CI pipeline on breaking changes

By default the command exits with code `1` when it finds a breaking change.
Use it as a pull request check:

```bash
redocly diff main-openapi.yaml pr-openapi.yaml
# exit code 1 when breaking changes are found
```

### Generate an HTML report

To write a report that you can share, use `--format=html` together with `--output`:

```bash
redocly diff v1.yaml v2.yaml --format=html -o diff-report.html
```

### Annotate a pull request

The `codeframe`, `checkstyle`, `codeclimate`, `summary`, `github-actions`, and `junit` formats come from the `lint` command.
Your existing CI integrations accept the diff report as it is.
With `github-actions`, every breaking change becomes an annotation on the pull request:

```bash
redocly diff main-openapi.yaml pr-openapi.yaml --format=github-actions
```

These formats describe the breaking changes only, because each entry carries a severity.
Use `json` when you need every change, including the non-breaking ones.
These formats print to stdout and do not support `--output`.
The `junit` report names its test suite `redocly lint`.
