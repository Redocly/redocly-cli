---
slug: /docs/cli/v1/rules/configurable-rules
---

# Configurable rules

Configure flexible rules to meet any situation not covered by the [built-in rules](./built-in-rules.md) by adding to the `rules` map in the Redocly configuration file.

```yaml
rules:
  rule/my-rule-name: ...
  rule/one-more-rule-name: ...
```

A configurable rule describes the contents that the linter expects to find in your API description. During the validation process, the linter goes through your API description and checks if its contents match the expectations. If something was described in a configurable rule, but the API description doesn't correspond to the description, the linter shows you a warning or error message in the log.

| Pattern Property | Type                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rule/{string}    | [Configurable rule object](#configurable-rule-object) | Configurable rule definitions enforce your custom API design standards. Add or edit your configurable rules in the configuration file. A configurable rule is a rule that starts with a `rule/` prefix followed by a unique rule name. Rule names display in the lint log if the assertions fail. More than one configurable rule may be defined, and any configurable rule may have multiple assertions. |

## Configurable rule object

| Property   | Type                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject    | [Subject object](#subject-object)     | **REQUIRED.** Locates the specific [OpenAPI node type](#subject-node-types-and-properties) or `any` (see [example](#any-example)) and possible properties and values that the [lint command](../commands/lint.md) evaluates. Use with `where` to narrow further.                                                                                                                                                                                                                                                                             |
| assertions | [Assertion object](#assertion-object) | **REQUIRED.** Flags a problem when a defined assertion evaluates false. There are a variety of built-in assertions included. You may also create plugins with custom functions and use them as assertions.                                                                                                                                                                                                                                                                                                                                   |
| where      | [[Where object](#where-object)]       | Narrows subjects by evaluating the where list first in the order defined (from top to bottom). The resolution of reference objects is done at the `where` level. See [where example](#where-example). The `where` evaluation itself does not result in any problems.                                                                                                                                                                                                                                                                         |
| message    | string                                | Problem message displayed if the assertion is false. If omitted, the default message is: "{{assertionName}} failed because the {{subject}} {{property}} didn't meet the assertions: {{problems}}" is displayed. The available placeholders are displayed in that message. In the case there are multiple properties, the `{{property}}` placeholder produces a comma and space separate list of properties. In case there are multiple problems, the `{{problems}}` placeholder produces a bullet-list with a new line between each problem. |
| suggest    | [string]                              | List of suggestions to display if the problem occurs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| severity   | string                                | Configure the severity level of the problem if the assertion is false. It must be one of these values: `error`, `warn`, `off`. Default value is `error`.                                                                                                                                                                                                                                                                                                                                                                                     |

## Subject object

| Property            | Type                       | Description                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| type                | string                     | **REQUIRED.** Locates the [OpenAPI node type](#subject-node-types-and-properties) that the [lint command](../commands/lint.md) evaluates.                                                                                                                                                                                              |
| property            | string \| [string] \| null | Property name corresponding to the [OpenAPI node type](#subject-node-types-and-properties). If a list of properties is provided, assertions evaluate against each property in the sequence. If not provided (or null), assertions evaluate against the key names for the subject node type. See [property example](#property-example). |
| filterInParentKeys  | [string]                   | The name of the subject's parent key that locates where assertions run. An example value given the subject `Operation` could be `filterInParentKeys: [get, put]` means that only `GET` and `PUT` operations are evaluated for the assertions. See [example](#mutuallyrequired-example).                                                |
| filterOutParentKeys | [string]                   | The name of the subject's parent key that excludes where assertions run. An example value given the subject `Operation` could be `filterOutParentKeys: [delete]` means that all operations except `DELETE` operations are evaluated for the assertions.                                                                                |
| matchParentKeys     | string                     | Applies a regex pattern to the subject's parent keys to determine where assertions run. An example value given the subject `Operation` could be `matchParentKeys: /^p/` means that `POST`, `PUT`, and `PATCH` operations are evaluated for the assertions.                                                                             |

## Assertion object

A minimum of one assertion property is required to be defined.

| Property                    | Type              | Description                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| casing                      | string            | Asserts a casing style. Supported styles are: `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, `MACRO_CASE`, `COBOL-CASE`, `flatcase`. See [casing example](#casing-example).                                                                                                                                                                                                                      |
| const                       | string            | Asserts equality of a value. The behavior is the same as the `enum` assertion with exactly one value. See [const example](#const-example).                                                                                                                                                                                                                                                               |
| defined                     | boolean           | Asserts a property is defined. See [defined example](#defined-example).                                                                                                                                                                                                                                                                                                                                  |
| disallowed                  | [string]          | Asserts all listed values are not defined. See [disallowed example](#disallowed-example).                                                                                                                                                                                                                                                                                                                |
| enum                        | [string]          | Asserts a value is within a predefined list of values. Providing a single value in a list is an equality check. See [enum example](#enum-example).                                                                                                                                                                                                                                                       |
| maxLength                   | integer           | Asserts a maximum length (exclusive) of a string or list (array). See [maxLength example](#maxlength-example).                                                                                                                                                                                                                                                                                           |
| minLength                   | integer           | Asserts a minimum length (inclusive) of a string or list (array). See [minLength example](#minlength-example).                                                                                                                                                                                                                                                                                           |
| mutuallyExclusive           | [string]          | Asserts that listed properties (key names only) are mutually exclusive. See [mutuallyExclusive example](#mutuallyexclusive-example).                                                                                                                                                                                                                                                                     |
| mutuallyRequired            | [string]          | Asserts that listed properties (key names only) are mutually required. See [mutuallyRequired example](#mutuallyrequired-example).                                                                                                                                                                                                                                                                        |
| nonEmpty                    | boolean           | Asserts a property is not empty. See [nonEmpty example](#nonempty-example).                                                                                                                                                                                                                                                                                                                              |
| notPattern                  | string            | Asserts a value doesn't match a regex pattern. See [regex notPattern example](#notpattern-example).                                                                                                                                                                                                                                                                                                      |
| pattern                     | string            | Asserts a value matches a regex pattern. See [regex pattern example](#pattern-example).                                                                                                                                                                                                                                                                                                                  |
| ref                         | boolean \| string | Asserts a reference object presence in object's property. A boolean value of `true` means the property has a `$ref` defined. A boolean value of `false` means the property has not defined a `$ref` (it has an in-place value). A string value means that the `$ref` is defined and the unresolved value must match the pattern (for example, `'/paths\/. *\.yaml$/'`). See [ref example](#ref-example). |
| required                    | [string]          | Asserts all listed values are defined. See [required example](#required-example).                                                                                                                                                                                                                                                                                                                        |
| requireAny                  | [string]          | Asserts that at least one of the listed properties (key names only) is defined. See [requireAny example](#requireany-example).                                                                                                                                                                                                                                                                           |
| `{pluginId}/{functionName}` | object            | Custom assertion defined in the plugin. This function is called with options including the value. See [custom function example](#custom-function-example).                                                                                                                                                                                                                                               |

## Where object

The `where` object is part of a `where` list which must be defined in order from the root node.
Each node can only be used in one `where` object for each assertion.
Each subsequent node must be a descendant of the previous one.
Rules that use multiple `where` objects must target each one on a different node.
However, the same node could be used in the last `where` object and in the root `subject` object.
Nodes may be skipped in between the subject node types of the where list and those defined in the root subject type.

| Property   | Type                                  | Description                                                                                                                                                                                                                   |
| ---------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject    | [Subject object](#subject-object)     | **REQUIRED.** Narrows the subject further.                                                                                                                                                                                    |
| assertions | [Assertion object](#assertion-object) | **REQUIRED.** Applies assertions to determine if the subject should continue towards evaluating the main assertions. If an assertion fails, it narrows that from downstream subject evaluation and does not report a problem. |

Using the `where` narrowing changes how `Schema` nodes are evaluated.
When it is defined, the linter stops evaluating at the first `Schema` level that matches the narrowing criteria.

### `where` example

The following example asserts that PUT responses with HTTP status `200` or `201` cannot return an `application/pdf`content type.
Without the `where`, the assertion would evaluate every `MediaTypesMap` property including:

- Responses with all codes, including codes other than `200` or `201`.
- Responses for all HTTP methods, including DELETE, GET, POST, and more.
  To restrict the evaluation, use the `where` feature to limit what is evaluated.

```yaml
rule/no-pdf-in-ok-response:
  where:
    - subject:
        type: Operation
        filterInParentKeys:
          - put
      assertions:
        defined: true
    - subject:
        type: Response
        filterInParentKeys:
          - '201'
          - '200'
      assertions:
        defined: true
  subject:
    type: MediaTypesMap
  assertions:
    disallowed:
      - 'application/pdf'
```

The `where` section enables complex assertions based on sibling values.
The following example asserts that the `limit` parameter must have a schema with `type: integer`.

```yaml
rule/limit-is-integer:
  subject:
    type: Schema
    property: type
  assertions:
    const: integer
  where:
    - subject:
        type: Parameter
        property: name
      assertions:
        const: limit
```

## Examples

The following example shows four assertions with multiple asserts in each one (`defined`, `minLength`, `maxLength`, `pattern`).

The `Operation`, `Tag`, and `Info` properties must:

- be defined
- have at least 30 characters
- end with a _full stop_.

In addition, the `Operation` summary property must:

- be defined
- be between 20 and 60 characters
- not end with a _full stop_.

The following example shows how to configure those assertions:

```yaml
rules:
  rule/tag-description:
    subject:
      type: Tag
      property: description
    assertions:
      defined: true
      minLength: 30
      pattern: /\.$/
    message: Tag description must be at least 30 characters and end with a full stop.
  rule/operation-description:
    subject:
      type: Operation
      property: description
    assertions:
      defined: true
      minLength: 30
      pattern: /\.$/
    message: Operation description must be at least 30 characters and end with a full stop.
    severity: warn
  rule/info-description:
    subject:
      type: Info
      property: description
    assertions:
      defined: true
      minLength: 30
      pattern: /\.$/
    message: Info description must be at least 30 characters and end with a full stop.
  rule/operation-summary:
    subject:
      type: Operation
      property: summary
    assertions:
      defined: true
      minLength: 20
      maxLength: 60
      pattern: /[^\.]$/
    message: Operation summary must be between 20 and 60 characters and not end with a full stop.
```

### Custom function example

The following example asserts that `Operation` summary should start with an active verb and have at least three words.

The configuration file uses two custom functions `local/checkWordsStarts` and `local/checkWordsCount`. `local/checkWordsStarts` has a list of `words` in the options.
Custom function `local/checkWordsCount` has options with `min` which means that summary field should have a minimum number of words.

In `plugin.js` each functions retrieves its options, checks for problems, and returns a list of problems.

Each function is called with the following parameters:

| Property | Type                   | Description                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| value    | `string` \| [`string`] | Value that appears at the corresponding location.                                                                                                                                                                                                                                                                                                                              |
| options  | `object`               | Options that is described in the configuration file.                                                                                                                                                                                                                                                                                                                           |
| ctx      | `object`               | `ctx` object extends the [Context object](../custom-plugins/custom-rules.md#the-context-object) with two properties: `baseLocation`, and `rawValue`. Base location (`baseLocation`) contains the location in the source document for current assertion. (See [Location Object](../custom-plugins/custom-rules.md#location-object)). Raw value is the original assertion value. |

**Return**
problems | [`Problem`] | List of problems. An empty list means all checks are valid.

`Problem`
| Property | Type | Description |
| -- | -- | -- |
| message | `string` \| [`string`] | Problem message that is displayed in the [lint command](../commands/lint.md) output. |
| location | `Location Object` | Location in the source document. See [Location Object](../custom-plugins/custom-rules.md#location-object) |

`redocly.yaml`

```yaml
rule/operation-summary-check:
  subject:
    type: Operation
    property: summary
  message: Operation summary should start with an active verb
  assertions:
    local/checkWordsStarts:
      words:
        - Create
        - Retrieve
        - Merge
        - Delete
        - List
        - Upsert
        - Update
        - Approve
        - Reject
    local/checkWordsCount:
      min: 3
```

`plugin.js`

```js
module.exports = function localPlugin() {
  return {
    id: 'local',
    assertions: {
      checkWordsStarts: (value, options, ctx) => {
        const regexp = new RegExp(`^${options.words.join('|')}`);
        if (regexp.test(value)) {
          return [];
        }
        return [
          {
            message: 'Operation summary should start with an active verb',
            location: ctx.baseLocation,
          },
        ];
      },
      checkWordsCount: (value, options, ctx) => {
        const words = value.split(' ');
        if (words.length >= options.min) {
          return [];
        }
        return [
          {
            message: `Operation summary should contain at least ${options.min} words`,
            location: ctx.baseLocation,
          },
        ];
      },
    },
  };
};
```

## Assertion examples

### `casing` example

The following example asserts the casing style is `PascalCase` for `NamedExamples` map keys.

```yaml
rules:
  rule/named-examples-pascal-case:
    subject:
      type: NamedExamples
    assertions:
      casing: PascalCase
```

Casing supports the following styles:

- camelCase
- COBOL-CASE
- flatcase
- kebab-case
- snake_case
- PascalCase
- MACRO_CASE

### `const` example

The following example asserts that only `application/json` can be used as a key of the `MediaTypesMap`.

```yaml keys
rules:
  rule/media-type-map-application-json:
    subject:
      type: MediaTypesMap
    assertions:
      const: application/json
    message: Only application/json can be used
```

### `defined` example

The following example asserts that `x-codeSamples` is defined.

```yaml
rules:
  rule/x-code-samples-defined:
    subject:
      type: Operation
      property: x-codeSamples
    assertions:
      defined: true
```

The following example asserts that `x-code-samples` is undefined.

```yaml
rules:
  rule/x-code-samples-undefined:
    subject:
      type: Operation
      property: x-code-samples
    suggest:
      - x-codeSamples instead of x-code-samples
    assertions:
      defined: false
```

### `disallowed` example

The following example asserts that `x-code-samples` and `x-internal` are not defined.

```yaml
rules:
  rule/no-x-code-samples-and-x-internal:
    subject:
      type: Operation
    assertions:
      disallowed:
        - x-code-samples
        - x-internal
```

### `enum` example

The following example asserts that only `application/json` can be used as a key of the `MediaTypesMap`.
It has the same effect as the `const` assertion.

```yaml keys
rules:
  rule/media-type-map-application-json:
    subject:
      type: MediaTypesMap
    assertions:
      enum:
        - application/json
    message: Only application/json can be used
```

The following example asserts that the operation summary must match one of the listed enums.

```yaml values
rules:
  rule/operation-summary-match:
    subject:
      type: Operation
      property: summary
    assertions:
      enum:
        - My resource
        - My collection
    message: Summary must be one of the predefined values
    suggest:
      - change to 'My resource'
      - change to 'My collection'
```

### `maxLength` example

The following example asserts that the maximum length of each operation summary is 20 characters.

```yaml
rules:
  rule/operation-summary-max-length:
    subject:
      type: Operation
      property: summary
    message: Operation summary must have a maximum of 20 characters
    assertions:
      maxLength: 20
```

### `minLength` example

The following example asserts that the minimum length of each operation summary is 20 characters.

```yaml
rules:
  rule/operation-summary-min-length:
    subject:
      type: Operation
      property: summary
    message: Operation summary must have minimum of 20 chars length
    assertions:
      minLength: 20
```

### `mutuallyExclusive` example

The following example asserts the operation `description` and `externalDocs` must be mutually exclusive.
This assertion evaluates only property keys for the node, but not property values.

```yaml
rules:
  rule/operation-no-both-description-and-external-docs:
    subject:
      type: Operation
    assertions:
      mutuallyExclusive:
        - description
        - externalDocs
```

### `mutuallyRequired` example

The following example asserts that a response body schema must have both `amount` and `currency` properties (and not either one by itself).
This assertion evaluates only property keys for the node, but not property values.

```yaml Schema example
rules:
  rule/schema-properties-both-created-at-and-updated-at:
    subject:
      type: SchemaProperties
    assertions:
      mutuallyRequired:
        - created_at
        - updated_at
```

The following example asserts that when `PUT` requests have either `200` or `201` defined, both `200` and `201` responses must be defined.

```yaml Response example
rules:
  rule/put-200-and-201:
    subject:
      type: Responses
    where:
      - subject:
          type: Operation
          filterInParentKeys:
            - put
        assertions:
          defined: true
    message: Must mutually define 200 and 201 responses for PUT requests.
    assertions:
      mutuallyRequired:
        - '200'
        - '201'
```

### `nonEmpty` example

The following example asserts that the operation summary is not empty.

```yaml
rules:
  rule/operation-summary-non-empty:
    subject:
      type: Operation
      property: summary
    assertions:
      nonEmpty: true
```

### `notPattern` example

The following example asserts that the operation summary doesn't start with "The".

```yaml
rules:
  rule/operation-summary-does-not-start-with-the:
    subject:
      type: Operation
      property: summary
    assertions:
      notPattern: /^The/
```

Take care using `notPattern` with multiline Markdown values such as `description` fields.
These may end with a newline or a space rather than the character you expect.
Use the double-quoted style or take account of this in your pattern.

### `pattern` example

The following example asserts that the operation summary contains "test".

```yaml
rules:
  rule/operation-summary-contains-test:
    subject:
      type: Operation
      property: summary
    assertions:
      pattern: /test/
```

Take care using `pattern` with multiline Markdown values such as `description` fields.
These may end with a newline or a space rather than the character you expect.
Use the double-quoted style or take account of this in your pattern.

### `ref` example

The following example asserts that schema in MediaType contains a Reference object ($ref).

```yaml
rules:
  rule/mediatype-schema-has-ref:
    subject:
      type: MediaType
      property: schema
    assertions:
      ref: true
```

Also, you can specify a Regular Expression to check if the reference object conforms to it:

```yaml
rules:
  rule/mediatype-schema-ref-pattern:
    subject:
      type: MediaType
      property: schema
    message: Ref needs to point to components directory.
    assertions:
      ref: /^(\.\/)?components\/.*\.yaml$/
```

### `required` example

The following example asserts that `PUT` requests have both `200` and `201` responses defined.
The difference between `mutuallyRequired` is that neither `200` and `201` need to be defined for it to meet `mutuallyRequired` evaluations.

```yaml Response example
rules:
  rule/put-200-and-201:
    subject:
      type: Responses
    where:
      - subject:
          type: Operation
          filterInParentKeys:
            - put
        assertions:
          defined: true
    message: Must define 200 and 201 responses for PUT requests.
    assertions:
      required:
        - '200'
        - '201'
```

### `requireAny` example

The following example asserts that an operation must have either `description` or `externalDocs` defined.
This assertion evaluates only property keys for the node, but not property values.

```yaml Response example
rules:
  rule/operation-no-both-description-and-external-docs:
    subject:
      type: Operation
    assertions:
      requireAny:
        - description
        - externalDocs
```

## Subject node types and properties

Redocly defines a type tree based on the document type.
OpenAPI 2.0 has one type tree.
OpenAPI 3.0 and OpenAPI 3.1 share a type tree.

Learn more about the [OpenAPI node types](https://redocly.com/docs/openapi-visual-reference/openapi-node-types/).

### `any` example

The following example asserts that the maximum length of each description is 20 characters.

```yaml
rules:
  rule/description-max-length:
    subject:
      type: any
      property: description
    message: Each description must have a maximum of 20 characters
    assertions:
      maxLength: 20
```

### `property` example

The following example asserts that every path item has a GET operation defined.

```yaml
rules:
  rule/path-item-get-operation-defined:
    subject:
      type: PathItem
      property: get
    assertions:
      defined: true
```

A different way to declare the same assertion is to require that the `PathItem` has the `get` key.
Notice we don't need to include `property` in this approach.

```yaml
rules:
  rule/path-item-operation-required:
    subject:
      type: PathItem
    assertions:
      required:
        - get
    message: Every path item must have a GET operation.
```

The following example asserts that Tags have both name and description defined.

```yaml
rules:
  rule/tag-name-and-desc-defined:
    subject:
      type: Tag
      property:
        - name
        - description
    assertions:
      defined: true
    message: Every tag must have a name and description.
```

Another way to compose that rule is to require the subject keys:

```yaml
rules:
  rule/tag-name-and-desc-required:
    subject:
      type: Tag
    assertions:
      required:
        - name
        - description
```

## Find and share examples

Configurable rules allow such flexibility, but they can be complex to start with. To help you along the way, take a look at the [Redocly CLI Cookbook](https://github.com/Redocly/redocly-cli-cookbook#readme) where our community goes to share its best examples. Choose from the menu available, and don't forget to share your own rules too.
