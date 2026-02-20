# filter-in

Preserves nodes that have specific `property` set to the specific `value` and removes others.

## API design principles

Giant monolithic API docs can be overwhelming. By filtering what is most relevant to the audience, they can focus on what is most relevant and not be overwhelmed or distracted by all of the other API operations.

## Configuration

| Option             | Type     | Description                                                                                                                                                     |
| ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| property           | string   | **REQUIRED.** The property name used for evaluation. Attempts to match the values.                                                                           |
| value              | [string] | **REQUIRED.** List of values used for the matching.                                                                                                             |
| matchStrategy      | string   | Possible values: `all`, `any`. When `all`, must match all of the values supplied. When `any`, must match only one of the values supplied. Default value: `any`. |
| target             | string   | Possible values: `PathItem`, `Operation`. When set, filtering is scoped to the specified target.                                                                |
| noPropertyStrategy | string   | Possible values: `keep`, `remove` (default value: `keep`). Decides whether to keep nodes without the specified property. Useful with `target`.                  |

### Explicit vs. implicit target behavior

When `target` is explicitly set, the decorator walks through all nodes of that type and keeps those where the `property` matches the specified values.
Target nodes without the specified property are either kept (when `noPropertyStrategy` is set to `keep`) or removed (when `noPropertyStrategy` is set to `remove`).

If there's no explicit `target`, the decorator evaluates every node in the API description that has the `property` and keeps those where the property matches the specified values.
Nodes without the property are left unchanged.

## Examples

### Filter operations by operationId

Using the [Museum API](https://github.com/Redocly/museum-openapi-example) (v1.0.0), use the stats command to get a summary of its contents:

```bash
redocly stats openapi.yaml
```

I'm interested in the paths and operations in particular:

- Path Items: 5
- Operations: 8

To restrict an OpenAPI description to only a few endpoints, this example uses `operationId` with a list of permitted values. To configure this, add the following to `redocly.yaml`:

```yaml
apis:
  filter:
    root: openapi.yaml
    decorators:
      filter-in:
        target: Operation
        property: operationId
        value: [createSpecialEvent, listSpecialEvents]
        noPropertyStrategy: remove
```

To apply the decorator, use the `bundle` command:

```bash
redocly bundle filter -o museum-events.yaml
```

Looking through the resulting file, only the named operations are listed in the `paths` section, and running the `stats` command again shows that the filtered API description contains:

- Path Items: 1
- Operations: 2

This approach allows you to publish sections of your API, without needing to share the entire thing with every consumer, or maintain multiple API descriptions for those different audiences.

### Filter operations by a custom property

To keep only the operations marked for a public audience using a custom extension:

```yaml
decorators:
  filter-in:
    target: Operation
    property: x-audience
    value: [Public, Partner]
    noPropertyStrategy: remove
```

Operations without the `x-audience` property are removed, so only explicitly marked operations remain.

### Filter any node (implicit target behavior)

You can also use `filter-in` without `target` to filter on other elements, such as parameters, responses, or other OpenAPI items.
The example `redocly.yaml` shown below includes everything from the OpenAPI description that has an `x-audience` property set to either "Public" or "Partner":

```yaml
decorators:
  filter-in:
    property: x-audience
    value: [Public, Partner]
```

In this mode, nodes without the `x-audience` property are preserved.
This is useful when the property is applied broadly across different types of nodes in your API description.

Use the filter decorators so that you can maintain one complete source of truth in OpenAPI format, then prepare restricted documents as appropriate for downstream tools such as API reference documentation.

## Related decorators

- [filter-out](./filter-out.md)
- [remove-x-internal](./remove-x-internal.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/filters/filter-in.ts)
