---
redirectFrom:
  - /docs/cli/resources/rules/assertions/
---
# `assertions`

Configure assertions to enforce your API design standards without coding custom rules in JavaScript.

Define assertions in the `rules` map of the `lint` object in the Redocly configuration file.

```yaml
rules:
  assert/assertion-name:
    ...
  assert/one-more-assertion-name:
    ...
```

An assertion describes the contents that the linter expects to find in your API definition. During the validation process, the linter goes through your API definition and checks if its contents match the expectations. If something was described in an assertion, but the API definition doesn't correspond to the description, the linter shows you a warning or error message in the log.


Property | Type | Description
-- | -- | --
assert/my-assertion-name | [Assertion object](#assertion-object) | An assertion definition to enforce your custom API design standards. Add or edit your assertions in the configuration file. The assertion is a rule that starts with a `assert/` prefix followed by a unique assertion rule name. Assertion name is displayed in the lint log if the assertion fails. More than one assertion may be defined, and any assertion may have multiple asserts.

## Assertion object

Property | Type | Description
-- | -- | --
subject | `string` \| [`string`] | **REQUIRED.** The [OpenAPI node type](#openapi-node-types) that the lint evaluates. Use with `context` for more control.
property | `string` \| [`string`] \| null | Property name corresponding to the [OpenAPI node type](#openapi-node-types). If a list of properties is provided, assertions will evaluate against each property in the sequence. If not provided (or null), assertions will evaluate against the key names for the subject node type. See [property example](#property-example).
context | [Context object](#context-object) | The context influences evaluation for assertions. When `matchParentKeys` or `excludeParentKeys` is used in the `context` object, it evaluates the specified subset of the subject type. The resolution of reference objects is done at the context level. If no context is provided, it evaluates the assertion for all instances of the given type. See [context example](#context-example).
message | `string` | Problem message displayed if the assertion is false. If omitted, the default message is: "{{assertionName}} failed because the {{subject}} {{property}} didn't meet the assertions: {{problems}}" is displayed. The available placeholders are displayed in that message. In the case there are multiple properties, the `{{property}}` placeholder produces a comma and space separate list of properties. In case there are multiple problems, the `{{problems}}` placeholder produces a bullet-list with a new line between each problem.
suggest | [`string`] | List of suggestions to display if the problem occurs.
severity | `string` | Configure the severity level of the problem if the assertion is false. It must be one of these values: `error`, `warn`, `off`. Default value is `error`.
enum | [`string`] | Asserts a value is within a predefined list of values. See [enum example](#enum-example).
pattern | `string` | Asserts a value matches a regex pattern. See [regex pattern example](#pattern-example).
casing | `string` | Asserts a casing style. Supported styles are: `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, `MACRO_CASE`, `COBOL-CASE`, `flatcase`. See [casing example](#casing-example).
mutuallyExclusive | [`string`] | Asserts that listed properties (key names only) are mutually exclusive. See [mutuallyExclusive example](#mutuallyexclusive-example).
mutuallyRequired | [`string`] | Asserts that listed properties (key names only) are mutually required. See [mutuallyRequired example](#mutuallyrequired-example).
required | [`string`] | Asserts all listed values are defined. See [required example](#required-example).
requireAny | [`string`] | Asserts that at least one of the listed properties (key names only) is defined. See [requireAny example](#requireany-example).
disallowed | [`string`] | Asserts all listed values are not defined. See [disallowed example](#disallowed-example).
defined | `boolean` | Asserts a property is defined. See [defined example](#defined-example).
undefined | `boolean` | Asserts a property is undefined. See [undefined example](#undefined-example).
nonEmpty | `boolean` | Asserts a property is not empty. See [nonEmpty example](#nonempty-example).
minLength | `integer` | Asserts a minimum length (inclusive) of a string or list (array). See [minLength example](#minlength-example).
maxLength | `integer` | Asserts a maximum length (exclusive) of a string or list (array). See [maxLength example](#maxlength-example).
ref | `boolean \| string` | Asserts a reference object presence in object's property. A boolean value of `true` means the property has a `$ref` defined. A boolean value of `false` means the property has not defined a `$ref` (it has an in-place value). A string value means that the `$ref` is defined and the unresolved value must match the pattern (for example, `'/paths\/.*\.yaml$/'`). See [ref example](#ref-example).|
`{pluginId}/{functionName}` | `object` | Custom assert defined in the plugin. This function will be called with options including the value. See [custom function example](#custom-function-example).|

## Context object

Property | Type | Description
-- | -- | --
type | `string` | **REQUIRED.** One of the [OpenAPI node types](#openapi-node-types).
matchParentKeys | [`string`] | The list of parent object key names to evaluate with respect to the subject.
excludeParentKeys | [`string`] | The list of parent object key names to not evaluate with respect to the subject.

See the [context example](#context-example).

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
  assert/tag-description:
    subject: Tag
    property: description
    message: Tag description must be at least 30 characters and end with a full stop.
    severity: error
    defined: true
    minLength: 30
    pattern: /\.$/
  assert/operation-description:
    subject: Operation
    property: description
    message: Operation description must be at least 30 characters and end with a full stop.
    severity: error
    defined: true
    minLength: 30
    pattern: /\.$/
  assert/info-description:
    subject: Info
    property: description
    message: Info description must be at least 30 characters and end with a full stop.
    severity: error
    defined: true
    minLength: 30
    pattern: /\.$/
  assert/operation-summary:
    subject: Operation
    property: summary
    message: Operation summary must be between 20 and 60 characters and not end with a full stop.
    severity: error
    defined: true
    minLength: 20
    maxLength: 60
    pattern: /[^\.]$/
```

### `property` example

The following example asserts that every path item has a GET operation defined.

```yaml
rules:
  assert/path-item-get-operation-defined:
    subject: PathItem
    property: get
    message: Every path item must have a GET operation.
    defined: true
```

A different way to declare the same assertion is to require that the `PathItem` has the `get` key.
Notice we don't need to include `property` in this approach.

```yaml
rules:
  assert/path-item-operation-required:
    subject: PathItem
    message: Every path item must have a GET operation.
    required:
      - get
```

The following example asserts that Tags have both name and description defined.

```yaml
rules:
  assert/tag-name-and-desc-defined:
    subject: Tag
    property:
      - name
      - description
    message: Every tag must have a name and description.
    defined: true
```

Another way to compose that rule is to require the subject keys:

```yaml
rules:
  assert/tag-name-and-desc-required:
    subject: Tag
    message: Every tag must have a name and description.
    required:
      - name
      - description
```

### `context` example

The following example asserts that PUT responses with HTTP status 200 or 201 cannot return an `application/pdf`content type.
Without the `context`, the assertion would evaluate every MediaTypesMap including:
- Responses with all codes, including codes other than 200 or 201
- Responses for all HTTP methods, including DELETE, GET, POST, and more.
To restrict the evaluation, use the `context` feature to limit what will be evaluated.

```yaml
assert/no-pdf-in-ok-response:
  context:
  - type: Operation
    matchParentKeys: [put]
  - type: Response
    matchParentKeys: ['201', '200']
  subject: MediaTypesMap
  disallowed: ['application/pdf']
```

### Custom function example

The following example asserts that `Operation` summary should start with an active verb and have at least three words.

The configuration file uses two custom functions `local/checkWordsStarts` and `local/checkWordsCount`. `local/checkWordsStarts` has a list of `words` in the options. `local/checkWordsCount` has options with `min` which means that summary field should have a minimum number of words.

In `plugin.js` each functions retrieves its options, checks for problems, and returns a list of problems.

Each function is called with the following parameters:

Property | Type | Description
-- | -- | --
value | `string` \| [`string`] | Value that appears at the corresponding location.
options | `object` | Options that is described in config file.
location | `Location Object` | Location in the source document. See [Location Object](../resources/custom-rules.md#location-object)
**Return**
problems | [`Problem`] | List of problems. Empty list indicates that all checks are valid.

`Problem`
Property | Type | Description
-- | -- | --
message | `string` \| [`string`] | Problem message that will be displayed in result
location | `Location Object` | Location in the source document. See [Location Object](../resources/custom-rules.md#location-object)

`.redocly.yaml`
```yaml
assert/operation-summary-check:
  subject: Operation
  property: summary
  message: Operation summary should start with an active verb
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
module.exports = {
  id: 'local',
  assertions: {
    checkWordsStarts: (value, options, location) => {
      const regexp = new RegExp(`^${options.words.join('|')}`);
      if (regexp.test(value)) {
        return [];
      }
      return [{ message: 'Operation summary should start with an active verb', location }];
    },
    checkWordsCount: (value, options, location) => {
      const words = value.split(' ');
      if (words.length >= options.min) {
        return [];
      }
      return [
        { message: `Operation summary should contain at least ${options.min} words`, location },
      ];
    },
  },
};
```

### `enum` example

The following example asserts that only `application/json` can be used as a key of the MediaTypesMap.

```yaml keys
rules:
  assert/media-type-map-application-json:
    subject: MediaTypesMap
    message: Only application/json can be used
    severity: error
    enum:
      - application/json
```

The following example asserts that the operation summary must match one of the listed enums.

```yaml values
rules:
  assert/operation-summary-match:
    subject: Operation
    property: summary
    message: Summary must be one of the predefined values
    suggest:
      - change to 'My resource'
      - change to 'My collection'
    severity: error
    enum:
      - My resource
      - My collection
```

### `pattern` example

The following example asserts that the operation summary contains "test".

```yaml
rules:
  assert/operation-summary-contains-test:
    subject: Operation
    property: summary
    message: Summary should match a regex
    severity: error
    pattern: /test/
```

### `casing` example

The following example asserts the casing style is `PascalCase` for NamedExamples map keys.

```yaml
rules:
  assert/named-examples-pascal-case:
    subject: NamedExamples
    message: NamedExamples key must be in PascalCase
    severity: error
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


### `mutuallyExclusive` example

The following example asserts the operation `description` and `externalDocs` must be mutually exclusive.
This assertion evaluates only property keys for the node, but not property values.

```yaml
rules:
  assert/operation-no-both-description-and-external-docs:
    subject: Operation
    message: "Operation must not define both properties together: description and externalDocs"
    severity: error
    mutuallyExclusive:
      - description
      - externalDocs
```

### `mutuallyRequired` example

The following example asserts that a response body schema must have both `amount` and `currency` properties (and not either one by itself).
This assertion evaluates only property keys for the node, but not property values.

```yaml Schema example
rules:
  assert/schema-properties-both-created-at-and-updated-at:
    subject: SchemaProperties
    message: The created_at and updated_at properties are mutually required
    severity: error
    mutuallyRequired:
      - created_at
      - updated_at
```

The following example asserts that when `PUT` requests have either `200` or `201` defined, both `200` and `201` responses must be defined.

```yaml Response example
rules:
  assert/put-200-and-201:
    subject: Responses
    context:
      - type: Operation
        matchParentKeys:
          - put
    message: Must mutually define 200 and 201 responses for PUT requests.
    severity: error
    mutuallyRequired:
      - '200'
      - '201'
```

### `required` example

The following example asserts that `PUT` requests have both `200` and `201` responses defined.
The difference between `mutuallyRequired` is that neither `200` and `201` need to be defined for it to meet `mutuallyRequired` evaluations.

```yaml Response example
rules:
  assert/put-200-and-201:
    subject: Responses
    context:
      - type: Operation
        matchParentKeys:
          - put
    message: Must define 200 and 201 responses for PUT requests.
    severity: error
    required:
      - '200'
      - '201'
```

### `requireAny` example

The following example asserts that an operation must have either `description` or `externalDocs` defined.
This assertion evaluates only property keys for the node, but not property values.

```yaml Response example
rules:
  assert/operation-no-both-description-and-external-docs:
    subject: Operation
    message: "Operation must have one of the properties: description or externalDocs"
    severity: error
    requireAny:
      - description
      - externalDocs
```

### `disallowed` example

The following example asserts that `x-code-samples` and `x-internal` are not defined.

```yaml
rules:
  assert/no-x-code-samples-and-x-internal:
    subject: Operation
    message: x-code-samples and x-internal must not be defined
    severity: error
    disallowed:
      - x-code-samples
      - x-internal
```

### `defined` example

The following example asserts that `x-codeSamples` is defined.

```yaml
rules:
  assert/x-code-samples-defined:
    subject: Operation
    property: x-codeSamples
    message: x-codeSamples must be defined
    severity: error
    defined: true
```

### `undefined` example

The following example asserts that `x-code-samples` is undefined.

```yaml
rules:
  assert/x-code-samples-undefined:
    subject: Operation
    property: x-code-samples
    message: x-code-samples is deprecated
    suggest:
      - x-codeSamples instead of x-code-samples
    severity: error
    undefined: true
```

### `nonEmpty` example

The following example asserts that the operation summary is not empty.

```yaml
rules:
  assert/operation-summary-non-empty:
    subject: Operation
    property: summary
    message: Operation summary should not be empty
    severity: error
    nonEmpty: true
```

### `minLength` example

The following example asserts that the minimum length of each operation summary is 20 characters.

```yaml
rules:
  assert/operation-summary-min-length:
    subject: Operation
    property: summary
    message: Operation summary must have minimum of 20 chars length
    severity: error
    minLength: 20
```

### `maxLength` example

The following example asserts that the maximum length of each operation summary is 20 characters.

```yaml
rules:
  assert/operation-summary-max-length:
    subject: Operation
    property: summary
    message: Operation summary must have a maximum of 20 characters
    severity: error
    maxLength: 20
```

### `ref` example

The following example asserts that schema in MediaType contains a Reference object ($ref).

```yaml
rules:
  assert/mediatype-schema-has-ref:
    subject: MediaType
    property: schema
    message: Ref is required.
    ref: true
```

Also, you can specify a Regular Expression to check if the reference object conforms to it:

```yaml
rules:
  assert/mediatype-schema-ref-pattern:
    subject: MediaType
    property: schema
    message: Ref needs to point to components directory.
    ref: /^(\.\/)?components\/.*\.yaml$/
```

Redocly CLI

## OpenAPI node types

Redocly defines a type tree based on the document type.
OpenAPI 2.0 has one type tree.
OpenAPI 3.0 and OpenAPI 3.1 share a type tree.

### List of OpenAPI types

For technical details on the implementation of types for each OAS version, consult the source files in the Redocly CLI repository:
  - OAS 3.1: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/types/oas3_1.ts#L209
  - OAS 3.0: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/types/oas3.ts#L530
  - OAS 2.0: https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/types/oas2.ts#L367

List of types for OpenAPI 3.0 and 3.1:

- Root
- Tag
- ExternalDocs
- Server
- ServerVariable
- SecurityRequirement
- Info
- Contact
- License
- Paths
- PathItem
- Parameter
- Operation
- Callback
- RequestBody
- MediaTypesMap
- MediaType
- Example
- Encoding
- Header
- Responses
- Response
- Link
- Schema
- Xml
- SchemaProperties
- DiscriminatorMapping
- Discriminator
- Components
- NamedSchemas: mapOf('Schema')
- NamedResponses: mapOf('Response')
- NamedParameters: mapOf('Parameter')
- NamedExamples: mapOf('Example')
- NamedRequestBodies: mapOf('RequestBody')
- NamedHeaders: mapOf('Header')
- NamedSecuritySchemes: mapOf('SecurityScheme')
- NamedLinks: mapOf('Link')
- NamedCallbacks: mapOf('Callback')
- ImplicitFlow
- PasswordFlow
- ClientCredentials
- AuthorizationCode
- OAuth2Flows
- SecurityScheme
- XCodeSample
- WebhooksMap
