# filter-out

Removes nodes that have specific `property` set to the specific `value` and preserves others.
Nodes that don't have the `property` defined are not impacted.

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

This example filters out all the endpoints tagged "Events", and `redocly.yaml` looks like this:

```yaml
apis:
  filterout:
    root: openapi.yaml
    decorators:
      filter-out:
        property: tags
        value: Events
```

To apply the decorator to the OpenAPI description, run the `bundle` command, like this:

```bash
redocly bundle filterout -o museum-filtered.yaml
```

Open the output file, `museum-filtered.yaml`, and the endpoints relating to special events have all been removed. Repeat the `stats` command, and this time the numbers are reported as:

- Path Items: 3
- Operations: 3

This filtered OpenAPI description can be used to publish documentation or in another part of your API lifecycle where a limited part of your API is needed. Use a single source of truth in an OpenAPI description and allow the filtering to create the reduced version, rather than maintaining two API descriptions.

You can also use the `filter-out` decorator on arbitrary properties that appear inside any OpenAPI object. For example, the following configuration looks for a property `x-audience` and removes any elements that have this property set to "Internal". Using this approach, you can remove specific parameters, responses, or endpoints from your OpenAPI description.

```yaml
decorators:
  filter-out:
    property: x-audience
    value: Internal
```

## Related decorators

- [filter-in](./filter-in.md)
- [remove-x-internal](./remove-x-internal.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/filters/filter-out.ts)
