# filter-out

Removes nodes that have specific `property` set to the specific `value` and preserves others.
Nodes that don't have the `property` defined are not impacted.

## API design principles

Giant monolithic API docs can overwhelm anyone. By filtering what is most relevant to the audience, they can focus on what is most relevant and not be overwhelmed or distracted by all of the other API operations.

## Configuration

|Option|Type|Description|
|---|---|---|
|property|string|**REQUIRED.** The property name used for evaluation. It will attempt to match the values.|
|value|[string]|**REQUIRED.** List of values used for the matching.|
|matchStrategy|string|Possible values: `all`, `any`. If `all` it needs to match all of the values supplied. If `any` it needs to match only one of the values supplied. Default value: `any`.|

Example of configuration:

```yaml
decorators:
  filter-out:
    property: x-audience
    value: Internal
    matchStrategy: any
```

## Examples

Would you like examples? We would! They are coming soon.

## Related decorators

- [filter-in](./filter-in.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/filters/filter-out.ts)
