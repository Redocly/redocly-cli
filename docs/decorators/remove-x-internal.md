# remove-x-internal

Removes nodes that have a specific flag property.
Nodes that don't have the flag property defined are not impacted.

## API design principles

Sometimes partner or public APIs use the same schemas and endpoints as internal APIs with some minor differences.
This is a mechanism that can be used to maintain them together but generate two sets of API docs from a single-source-of-truth.

## Configuration

|Option|Type|Description|
|---|---|---|
|internalFlagProperty|string|The property name used for evaluation. Default value: `x-internal`|

Example of a configuration that uses `x-internal` as the flag property:

```yaml
decorators:
  remove-x-internal: on
```

Example of another configuration that changes the flag property:

```yaml
decorators:
  remove-x-internal:
    internalFlagProperty: 'x-private'
```

## Examples

Read the guide on [hiding internal APIs](../guides/hide-apis.md) to see examples.

## Related decorators

- [filter-out](./filter-out.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/remove-x-internal.ts)
- Remove additional remnants from components by also using the `--remove-unused-components` CLI argument.
