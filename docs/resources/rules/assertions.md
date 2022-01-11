# `assertions`

Configure assertions to enforce your API design standards without coding custom rules.

Define `assertions` in the rules map of the lint section of the configuration file.

```yaml
lint:
  rules:
    assertions: ...
```

Property | Type | Description
-- | -- | --
assertions | [[Assertion object]](#assertion-object) | A list of assertions to enforce your custom API design standards. Add or edit your assertions in the configuration file. The `assertions` rule is composed of a list of `assertion` objects. This rule may result in more than one problem message as you may define more than one assertion. More than one assertion may be defined, and an assertion may have more than one assert.

## Assertion object

Property | Type | Description
-- | -- | --
on | `string` \| [`string`] | **REQUIRED.** The node type, or list of node types, to the lint targets. Nodes are traversed with a dot `.` between nodes, and can start from any [OpenAPI node type](#openapi-node-types). A special value `$keys` can be used to target the keys of any map (for example, `ResponseMap.$keys`).
message | `string` | Problem message displayed if the assertion is false.
suggest | [`string`] | List of suggestions to display if the problem occurs.
severity | `string` | The severity level of the problem if the assertion is false. It must be one of these values: `error`, `warn`, `off`. Default value is `error`.
enum | [`string`] | Asserts value is within a predefined list of values. See [enum example](#enum-example).
pattern | `string` | Asserts value matches a regex pattern. See [regex pattern example](#regex-pattern-example).
casing | `string` | Asserts a casing style from this possible list: `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, `MACRO_CASE`, `COBOL-CASE`, `flatcase`. See [casing example](#casing-example).
mutuallyExclusive | [`string`] | Asserts list of properties (key names only) are mutually exclusive. Use `$keys` in the `on` when this is enabled (for example, `Operation.$keys`). See [mutuallyExclusive example](#mutuallyexclusie-example).
mutuallyRequired | [`string`] | Asserts list of properties (key names only) are mutually required. Use `$keys` in the `on` when this is enabled (for example, `Operation.$keys`). See [mutuallyRequired example](#mutuallyrequired-example).
defined | `boolean` | Asserts a property is defined. See [defined example](#defined-example).
undefined | `boolean` | Asserts a property is undefined. See [undefined example](#undefined-example).
nonEmpty | `boolean` | Asserts a property is not empty. See [nonEmpty example](#nonempty-example).
minLength | `integer` | Asserts a minimum length (inclusive) of a string or list (array). See [minLength example](#minlength-example).
maxLength | `integer` | Asserts a maximum length (exclusive) of a string or list (array). See [maxLength example](#maxlength-example).
sortOrder | `string` \| [Sort Order object](#sort-order-object) | Asserts a sort order to a list (array) of strings or a list of objects by one of the object's property values. See [sortOrder example](#sortorder-example).

## Sort Order object

Property | Type | Description
-- | -- | --
direction | `string` | **REQUIRED.** Asserts values are sorted in ascending or descending order using one of these possible values: `asc` or `desc`.
property | `string` | **REQUIRED.** The name of the property in the collection of objects that will hold values to assess the sort order.

## Examples

The following example shows two assertions each multiple asserts (`defined`, `minLength`, `maxLength`, `pattern`).

The `Operation`, `Tag`, and `Info` properties must:
- be defined
- have at least 30 characters
- end with a _full stop_.

In addition, the `Operation` summary property must:
- be defined
- be between 20 and 60 characters
- not end with a _full stop_.

The following shows how to write that configuration:

```yaml
lint:
  rules:
    assertions:
      - on:
          - Tag.description
          - Operation.description
          - Info.description
        message: Description must be at least 30 characters and end with a full stop.
        severity: error
        defined: true
        minLength: 30
        pattern: /\.$/
      - on:
          - Operation.summary
        message: Operation summary must be at least 20 characters and not end with a full stop.
        severity: error
        defined: true
        minLength: 20
        maxLength: 60
        pattern: /^\.$/
      
```

### `enum` example

The following example asserts that only `application/json` can be used as a key of the media type map.
Append `$keys` to the `on` node value to run on the node's keys.

```yaml keys
lint:
  rules:
    assertions:
      - on: MediaTypeMap.$keys
        message: Only application/json can be used
        severity: error
        enum:
          - application/json
```

The following example asserts that the operation summary must match one of the listed enums.

```yaml values
lint:
  rules:
    assertions:
      - on: Operation.summary
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
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Summary should match a regex
        severity: error
        pattern: /test/
```

### `casing` example

The following example asserts the casing style is `PascalCase` for named Examples map keys.

```yaml
lint:
  rules:
    assertions:
      - on: NamedExamples.$keys
        message: NamedExamples key must be in PascalCase
        severity: error
        casing: PascalCase
```

Casing supports these styles: 
- camelCase
- COBOL-CASE
- flatcase
- kebab-case
- snake_case
- PascalCase
- MACRO_CASE


### `mutuallyExclusive` example

The following example asserts the operation `description` and `externalDocs` must be mutually exclusive.
This assert runs only on node's keys.
Append `$keys` to the `on` node value to run on the node's keys.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.$keys
        message: "Operation must not define both properties together: description and externalDocs"
        severity: error
        mutuallyExclusive:
          - description
          - externalDocs
```

### `mutuallyRequired` example

The following example asserts that a response body schema must have both `amount` and `currency` properties (and not either one by itself).
This assertion runs only on node's keys.
Append `$keys` to the `on` node value to run on the node's keys.

```yaml Schema example
lint:
  rules:
    assertions:
      # - on: Operation.Response.$keys check this
        message: The created_at and updated_at properties are mutually required
        severity: error
        mutuallyRequired:
          - created_at
          - updated_at
```

The following example asserts that `PUT` requests have both `200` and `201` responses defined.

```yaml Response example
lint:
  rules:
    assertions:
      - on: PathItem.put.responses.$keys
        message: Must define 200 and 201 responses for PUT requests.
        severity: error
        mutuallyRequired:
          - '200'
          - '201'
```

### `defined` example

The following example asserts that `x-codeSamples` is defined.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.x-codeSamples
        message: x-codeSamples must be defined
        severity: error
        defined: true
```

### `undefined` example

The following example asserts that `x-code-samples` is undefined.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.x-code-samples
        message: x-code-samples is deprecated
        suggest: 
          - x-codeSamples instead of x-code-samples
        severity: error
        undefined: true
```

### `nonEmpty` example

The following example asserts that the operation summary is not empty.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Operation summary should not be empty
        severity: error
        nonEmpty: true
```

### `minLength` example

The following example asserts that the minimum length of each operation summary is 20 characters.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Operation summary must have minimum of 20 chars length
        severity: error
        minLength: 20
```

### `maxLength` example

The following example asserts that the maximum length of each operation summary is 20 characters.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Operation summary must have maximum of 20 characters
        severity: error
        maxLength: 20
```

### `sortOrder` example

Sort order can be applied on lists (arrays) of strings or lists of objects (collections).

The following example asserts that the status schema's enum list is in alphabetical order.

```yaml
lint:
  rules:
    assertions:
      - on: Schema.status.enum
        message: The status enums should be in alphabetical order
        suggest:
          - alphabetize the list of status enums
        severity: error
        sortOrder: asc
```

The following example asserts the tag names (tags are a collection) are sorted in alphabetical order.

The `property` field is **REQUIRED** to sort collections based on that property's value. 

```yaml
lint:
  rules:
    assertions:
      - on: Operation.tags
        message: Tags should be ordered by name in alphabetical order
        severity: error
        sortOrder:
          direction: asc
          property: name
```

## OpenAPI node types

Redocly defines a type tree based on the document type.
OpenAPI 2.0 has one type tree.
OpenAPI 3.0 and OpenAPI 3.1 share a type tree.

Node types are traversed using dot notation.

The following example shows ways to traverse to the equivalent destination.
One starts from the definition root into the info description.
The other starts from the info section.

```yaml Traversal from DefinitionRoot object type
lint:
  rules:
    assertions:
      - on:
        - DefinitionRoot.info.description
```

```yaml Traversal from Info object type
lint:
  rules:
    assertions:
      - on:
        - Info.description
```

### List of OpenAPI types

Implementation of types for each specific OAS version:
  - OAS 3.1: https://github.com/Redocly/openapi-cli/blob/master/packages/core/src/types/oas3_1.ts#L209
  - OAS 3.0: https://github.com/Redocly/openapi-cli/blob/master/packages/core/src/types/oas3.ts#L530
  - OAS 2.0: https://github.com/Redocly/openapi-cli/blob/master/packages/core/src/types/oas2.ts#L367

List of types for OpenAPI 3.0 and 3.1:

- DefinitionRoot
- Tag
- ExternalDocs
- Server
- ServerVariable
- SecurityRequirement
- Info
- Contact
- License
- PathMap
- PathItem
- Parameter
- Operation
- Callback
- RequestBody
- MediaTypeMap
- MediaType
- Example
- Encoding
- Header
- ResponsesMap
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
- NamedCallbacks: mapOf('PathItem')
- ImplicitFlow
- PasswordFlow
- ClientCredentials
- AuthorizationCode
- SecuritySchemeFlows
- SecurityScheme
- XCodeSample
- WebhooksMap
