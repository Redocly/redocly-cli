# filter-in

Preserves nodes that have specific `property` set to the specific `value` and removes others. Nodes that don't have the `property` defined are not impacted.

## API design principles

Giant monolithic API docs can be overwhelming. By filtering what is most relevant to the audience, they can focus on what is most relevant and not be overwhelmed or distracted by all of the other API operations.

## Configuration

| Option        | Type     | Description                                                                                                                                                             |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| property      | string   | **REQUIRED.** The property name used for evaluation. It attempts to match the values.                                                                                   |
| value         | [string] | **REQUIRED.** List of values used for the matching.                                                                                                                     |
| matchStrategy | string   | Possible values: `all`, `any`. If `all` it needs to match all of the values supplied. If `any` it needs to match only one of the values supplied. Default value: `any`. |

## Examples

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
        property: operationId
        value: [createSpecialEvent, listSpecialEvents]
```

To apply the decorator, use the `bundle` command:

```bash
redocly bundle filter -o museum-events.yaml
```

Looking through the resulting file, only the named operations are listed in the `paths` section, and running the `stats` command again shows that the filtered API description contains:

- Path Items: 1
- Operations: 2

This approach allows you to publish sections of your API, without needing to share the entire thing with every consumer, or maintain multiple API descriptions for those different audiences.

You can also use `filter-in` on other elements, such as parameters, responses, or other OpenAPI items.The example `redocly.yaml` shown below includes everything from the OpenAPI description that has an `x-audience` property set to either "Public" or "Partner":

```yaml
decorators:
  filter-in:
    property: x-audience
    value: [Public, Partner]
```

Use the filter decorators so that you can maintain one complete source of truth in OpenAPI format, then prepare restricted documents as appropriate for downstream tools such as API reference documentation.

## Related decorators

- [filter-out](./filter-out.md)
- [remove-x-internal](./remove-x-internal.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/filters/filter-in.ts)
