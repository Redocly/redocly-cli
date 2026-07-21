# Variant of the `operation-operationId` rule that excludes `OPTIONS` operations

Author:

- [@nickcorby](https://github.com/nickcorby)

## What this does and why

This rule throws an error for all operations that are missing the `operationId` property, while filtering out specific operations that you want to exclude from this validation (e.g. `OPTIONS`).

This rule can be tweaked to exclude any combination of operations, or inversely to **include** set operations.

## Code

This rule is added to the `rules` section of your `redocly.yaml` file:

```yaml
rule/operation-operationId-exclude-OPTIONS:
  subject:
    type: Operation
    filterOutParentKeys:
      - options
  assertions:
    required:
      - operationId
  message: Operation is missing 'operationId' property.
  severity: error
```

The `filterOutParentKeys` property allows you to define which operations you would like to exclude from the rule:

```yaml
type: Operation
filterOutParentKeys:
  - options
```

This can be extended to multiple operations:

```yaml
type: Operation
filterOutParentKeys:
  - options
  - delete
```

Alternatively, you can use the `filterInParentKeys` property to define which operations you would like to include in the rule:

```yaml
type: Operation
filterInParentKeys:
  - get
  - post
```

## Examples

With the rule configured with `severity: error`, the following snippet of a `GET` and `POST` operations will trigger this rule and display an error:

```yaml
openapi: 3.1.0
info: {}
paths:
  /menu:
    get: # Error: Operation is missing 'operationId' property. Rule: operation-operationId-exclude-OPTIONS
      responses:
        '200':
          content: {}

    post: # Error: Operation is missing 'operationId' property. Rule: operation-operationId-exclude-OPTIONS
      responses:
        '201':
          content: {}

    options: # No error
      responses:
        '204':
          content: {}
```

**Note:** If you are using a ruleset that includes the [operation-operationId](https://redocly.com/docs/cli/rules/oas/operation-operationId) rule (like `recommended`), you will need to disable this rule in order for the configurable rule to apply.

If your `redocly.yaml` file contains:

```yaml
extends:
  - recommended
```

You will need to include the following snippet in the `rules` property:

```yaml
rules:
  operation-operationId: off
```

## References

Assisted by [AlbinaBlazhko17](https://github.com/AlbinaBlazhko17)
