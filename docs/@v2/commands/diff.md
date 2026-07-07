# `diff`

## Introduction

{% admonition type="warning" name="Important" %}
The `diff` command is considered an experimental feature.
This means it's still a work in progress and may go through major changes, including its output formats and rule ids.
{% /admonition %}

The `diff` command compares two API descriptions and reports what was added, removed, and changed.
For OpenAPI 3.x, changes are also classified as breaking or non-breaking, so you can catch breaking changes before they reach your consumers.

## Usage

```bash
redocly diff <base> <revision>
redocly diff v1/openapi.yaml v2/openapi.yaml
redocly diff https://example.com/openapi.yaml openapi.yaml --format=json
redocly diff main@v1 main@v2 --fail-on=breaking
```

## Options

| Option        | Type    | Description                                                                                                                           |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| base          | string  | **REQUIRED.** Path, URL, or config alias of the base (older) API description.                                                         |
| revision      | string  | **REQUIRED.** Path, URL, or config alias of the revision (newer) API description.                                                     |
| --config      | string  | Specify path to the [configuration file](../configuration/index.md).                                                                  |
| --fail-on     | string  | Exit with code `1` when changes at this level are found. <br /> **Possible values:** `breaking`, `none`. Default value is `breaking`. |
| --format      | string  | Format for the output. <br /> **Possible values:** `stylish`, `json`, `markdown`, `html`. Default value is `stylish`.                 |
| --help        | boolean | Show help.                                                                                                                            |
| --lint-config | string  | Specify the severity level for the configuration file. <br /> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.   |
| --output, -o  | string  | Write the report to a file instead of stdout.                                                                                         |
| --version     | boolean | Show version number.                                                                                                                  |

## How it works

- Both descriptions are bundled, so external `$ref`s are resolved before comparison.
- List items with a natural identity (for example, parameters keyed by `in` + `name`) are matched by identity, so reordering them is not reported as a change.
- Changes to shared components are reported once, at the component location; whether a component change is breaking is derived from where the component is used (requests, responses, or both).
- Changes the tool detects but cannot judge automatically (for example, a `$ref` that now points to a different target) are conservatively reported as `breaking`.
- Structural comparison works for all supported specification types; breaking-change classification applies to OpenAPI 3.x.

{% admonition type="info" name="Limitations" %}
The `diff` command detects common breaking changes using a documented rule catalog; it is not an exhaustive detector.
Renaming a component (for example, a schema or parameter) is seen as a removal plus an addition, not a rename, so the new `$ref` target is reported as `breaking` (`ref-target-changed`) rather than matched to its previous identity.
Comparing documents of different specification families (for example, OpenAPI 2.0 vs OpenAPI 3.1) is not supported.
Reordering subschemas inside `allOf`, `oneOf`, or `anyOf` (and other lists without a natural identity) is matched positionally and may be reported as changes.
`readOnly` and `writeOnly` do not refine request/response polarity; a component used on both sides is judged under both, and the stricter verdict wins.
Reordering items that do have an identity (for example, `servers`, matched by URL) is not reported, even though `servers` order can be semantically meaningful.
Comparing across minor versions (OpenAPI 3.0 vs 3.1) can surface syntactic-only differences (for example, `nullable: true` vs `type: [..., "null"]`).
Changes under `callbacks` and `webhooks` receive structural diffing only, with no breaking-change classification, because their request/response direction is inverted.
{% /admonition %}

## Breaking change rules

| Rule id                          | Description                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `operation-removed`              | Removing an operation breaks all of its consumers.                                                                               |
| `path-removed`                   | Removing a path breaks all consumers of its operations.                                                                          |
| `parameter-removed`              | Removing a request parameter breaks clients that send it.                                                                        |
| `parameter-added-required`       | Adding a new required parameter breaks clients that do not send it.                                                              |
| `parameter-became-required`      | Marking an existing request parameter as required breaks clients that omit it.                                                   |
| `schema-type-changed`            | Narrowing a type restricts what clients may send; widening restricts what they can rely on receiving.                            |
| `enum-values-removed`            | Removing enum values restricts what clients may send.                                                                            |
| `enum-values-added`              | Adding enum values to response data may send clients values they never handled.                                                  |
| `required-properties-added`      | Requiring new request properties breaks clients that do not send them.                                                           |
| `required-properties-removed`    | Un-requiring response properties breaks clients that rely on their presence.                                                     |
| `property-removed-from-response` | Removing a response property breaks clients that read it.                                                                        |
| `response-removed`               | Removing a response breaks clients that handle it.                                                                               |
| `media-type-removed`             | Removing a media type breaks clients that produce or consume it.                                                                 |
| `ref-target-changed`             | A `$ref` now points to a different target; content equivalence cannot be verified automatically. This is reported as `breaking`. |

## Verdicts

Each change carries ALL triggered rule verdicts in a `verdicts` array. Each verdict includes:

- `ruleId`: The rule identifier (for example, `parameter-became-required`)
- `compat`: The compatibility classification (`breaking` or `non-breaking`)
- `message`: A human-readable description of the violation

The change's own `compat` field, in every output format, is the most severe verdict across all triggered rules.

### Locations

Each change reports the source file, line, and column of the affected node on both sides (`base` and `revision`). In the `stylish` format, changes are grouped per operation (for example, `GET /pets`) and each change includes a clickable `file:line:col` reference — the base file for removals, the revision file otherwise. For multi-file API descriptions, nodes pulled in from files referenced via `$ref` resolve to `1:1` of the root file.

### Path parameter renaming

Renaming a path parameter (for example, `/pets/{id}` → `/pets/{petId}`) is treated as the same endpoint, not a removal plus an addition. The rename is reported as a non-breaking change of the path template, alongside a non-breaking change of the parameter's `name`. If the match is ambiguous (several paths differing only in parameter names), the paths are compared by their literal keys instead. If a renamed path's operations define `callbacks` whose own path items declare a parameter with the same name as the renamed one, that callback parameter may be reported as removed and added; this is a cosmetic structural change, never a breaking verdict, because callbacks are not classified as request or response.

## Examples

### Fail a CI pipeline on breaking changes

Use the default `--fail-on=breaking` behavior to make `diff` exit with code `1` when it finds breaking changes, which is useful as a pull request check:

```bash
redocly diff main-openapi.yaml pr-openapi.yaml
# exit code 1 when breaking changes are found
```

### Generate an HTML report

Use `--format=html` together with `--output` to write a shareable HTML report instead of printing to the terminal:

```bash
redocly diff v1.yaml v2.yaml --format=html -o diff-report.html
```
