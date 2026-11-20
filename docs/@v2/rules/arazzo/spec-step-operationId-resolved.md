# spec-step-operationId-resolved

The `operationId` of a step must resolve to an operation in a source description.

| Arazzo | Compatibility |
| ------ | ------------- |
| 1.x    | ✅            |

## Design principles

The Arazzo specification defines the `operationId` of a step as the name of an existing, resolvable operation in one of the `sourceDescriptions`.
A step that names an operation that does not exist cannot be executed.
A typo in the `operationId`, or an operation renamed in the API description, otherwise stays unnoticed until the workflow runs.

The `spec-step-operationId-resolved` rule loads each source description with the `openapi` type and reads the `operationId` of the operations under its `paths`.
It reports a step when:

- The `operationId` is not defined in any of the source descriptions.
- The `operationId` is defined in more than one source description.
  Use the `$sourceDescriptions.<name>.<operationId>` form to pick one.
- The `operationId` uses the `$sourceDescriptions.<name>.<operationId>` form, and the source description `<name>` does not define the operation.
- The `operationId` uses the `$sourceDescriptions.<name>.<operationId>` form, and `<name>` is not in the `sourceDescriptions` list.

The rule also accepts the `<name>.<operationId>` short form that Respect supports in addition to the specification.

The rule does not report a step when it cannot read the operations it has to check:

- A source description file that cannot be loaded.
- A source description with the `asyncapi` type.

## Configuration

| Option   | Type   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| severity | string | Possible values: `off`, `warn`, `error`. Default: `error` (in `recommended` configuration). |

An example configuration:

```yaml
rules:
  spec-step-operationId-resolved: error
```

## Examples

Given the following configuration:

```yaml
rules:
  spec-step-operationId-resolved: error
```

And a `cafe.yaml` OpenAPI description that defines the `listMenuItems` operation.

Example of an **incorrect** step that names an operation the source description does not define:

```yaml Incorrect example
sourceDescriptions:
  - name: cafe-api
    type: openapi
    url: cafe.yaml
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: listMenu
```

Example of **correct** steps:

```yaml Correct example
sourceDescriptions:
  - name: cafe-api
    type: openapi
    url: cafe.yaml
workflows:
  - workflowId: place-order
    steps:
      - stepId: list-menu-items
        operationId: listMenuItems
      - stepId: list-menu-items-again
        operationId: $sourceDescriptions.cafe-api.listMenuItems
```

## Related rules

- [spec-step-mutually-exclusive-fields](./spec-step-mutually-exclusive-fields.md)
- [sourceDescription-type](./sourceDescription-type.md)
- [workflow-dependsOn](./workflow-dependsOn.md)

## Resources

- [Rule source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/rules/arazzo/spec-step-operationId-resolved.ts)
- [Step Object in the Arazzo specification](https://spec.openapis.org/arazzo/v1.0.1.html#step-object)
