# `assertions`

Configure assertions to enforce your API design standards without coding custom rules.

Define the `assertions` key in the lint rules of the configuration file.

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
description | `string` | Problem message displayed if the assertion is false.
severity | `string` | The severity level of the problem if the assertion is false. It must be one of these values: `error`, `warn`, `off`. Default value is `error`.
enum | [`string`] | Asserts value is within a predefined list of values. See [enum example](#enum-example).
pattern | `string` | Asserts value matches a regex pattern. See [regex pattern example](#regex-pattern-example).
casing | `string` | Asserts a casing style from this possible list: `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, `MACRO_CASE`, `COBOL-CASE`, `flatcase`. See [casing example](#casing-example).
mutuallyExclusive | [`string`] | Asserts list of properties (key names only) are mutually exclusive. Use `$keys` in the `on` when this is enabled (for example, `Operation.$keys`). See [mutuallyExclusive example](#mutuallyexclusie-example).
mutuallyRequired | [`string`] | Asserts list of properties (key names only) are mutually required. Use `$keys` in the `on` when this is enabled (for example, `Operation.$keys`). See [mutuallyRequired example](#mutuallyrequired-example).
defined | `boolean` | Asserts a property is defined. See [defined example](#defined-example).
undefined | `boolean` | Asserts a property is undefined. See [undefined example](#undefined-example).
nonEmpty | `boolean` | Asserts a property is not empty. See [nonEmpty example](#nonempty-example).
length | `integer` | Asserts a length of a string or list (array). See [length example](#length-example).
minLength | `integer` | Asserts a minimum length (inclusive) of a string or list (array). See [minLength example](#minlength-example).
maxLength | `integer` | Asserts a maximum length (exclusive) of a string or list (array). See [maxLength example](#maxlength-example).


## Examples

The following example shows two assertions each multiple asserts (`defined`, `minLength`, `maxLength`, `pattern`).

The `Operation`, `Tag`, and `Info` properties must:
- be defined
- have at least 30 characters
- end with a "_full stop_".

In addition, the `Operation` summary property must:
- be defined
- be between 20 and 60 characters
- not end with a "_full stop_".

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
        pattern: /(full stop)$/
      - on:
          - Operation.summary
        message: Operation summary must be at least 20 characters and not end with a full stop.
        severity: error
        defined: true
        minLength: 20
        maxLength: 60
        pattern: /^(full stop)$/
      
```
<!-- TODO: is the regex not /\\.$/? -->

### `enum` example

Assert that keys or values are in a list of values.
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

```yaml values
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Summary must be one of the predefined values
        severity: error
        enum:
          - one
          - two
```

### `pattern` example

This example shows a regex pattern to assert that the operation summary contains "test".

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

This example enforces `PascalCase` casing style for named Examples keys.

<!-- TODO: Does casing work on keys? I would like to do it on media type examples PascalCase. Please add an example.  -->

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

This example asserts the operation `description` and `externalDocs` must be mutually exclusive.
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

This example asserts that a response body schema must have both `amount` and `currency` properties (and not either one by itself).
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

This example asserts that PUT requests have both 200 and 201 responses defined.

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

This example asserts that `x-codeSamples` is defined.

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

This example asserts that `x-code-samples` is undefined.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.x-code-samples
        message: use x-codeSamples instead of x-code-samples
        severity: error
        undefined: true
```

### `nonEmpty` example

This example asserts that the operation summary is not empty.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Operation summary should not be empty
        severity: error
        nonEmpty: true
```

### `length` example

The example asserts the exact length of the summary string is 20 characters.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Operation summary must have 20 characters
        severity: error
        length: 20
```

The example asserts the list of the status enums is 20 characters exactly.

```yaml
lint:
  rules:
    assertions:
      - on: Schema.status
        message: The status property enum must have 20 items
        severity: error
        length: 20
```
<!-- Help check this example is correct -->

### `minLength` example

This example asserts that the minimum length of each operation summary is 20 characters.

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

This example asserts that the maximum length of each operation summary is 20 characters.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.summary
        message: Operation summary must have maximum of 20 characters
        severity: error
        maxLength: 20
```

<!-- 
TODO: discuss

### `sortOrder` example

To enforce sort order in array of strings or array of objects (collection). 
If the `property` fields is present, it means that we check the sort order direction on collection. 
Also, in case of array of strings the direction could be also set like `sortOrder: asc`.

```yaml
lint:
  rules:
    assertions:
      - on: Operation.tags
        message: Tags should be ordered in ASC direction
        severity: error
        sortOrder:
          direction: asc
          property: name
``` -->
