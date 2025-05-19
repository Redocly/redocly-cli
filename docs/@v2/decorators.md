# Decorators

Decorators are a way of changing an API description during bundling. This updating during bundling can be useful for the following use cases:

- removing some endpoints from an OpenAPI description before publishing
- updating description fields
- adding extra elements, such as examples, or metadata for other tools to use

To learn how to configure decorators, read more about their [configuration syntax](#decorator-configuration-syntax).

## List of decorators

Some common decorator use cases are already built in to Redocly. Check the list below for the decorators you can use immediately.

### Update descriptions

- [info-description-override](./decorators/info-description-override.md)
- [info-override](./decorators/info-override.md)
- [operation-description-override](./decorators/operation-description-override.md)
- [tag-description-override](./decorators/tag-description-override.md)

### Change examples

- [media-type-examples-override](./decorators/media-type-examples-override.md)

### Remove content

- [filter-in](./decorators/filter-in.md)
- [filter-out](./decorators/filter-out.md)
- [remove-unused-components](./decorators/remove-unused-components.md)
- [remove-x-internal](./decorators/remove-x-internal.md)

Have an idea for a decorator?
We might build it for you and give it to the world.
Open a [GitHub issue](https://github.com/Redocly/redocly-cli/issues) and let us know.

## Decorator configuration syntax

The following example shows how to configure a decorator in the [Redocly configuration file](./configuration/index.md).

```yaml
apis:
  main:
    root: ./openapi/openapi.yaml
    decorators:
      decorator-name:
        decorator-option: example-value
decorators:
  decorator-name:
    decorator-option: example-value
```

Optionally, you may specify `severity` as one of decorator options in the configuration. Severity can be set to `error`, `warn` or `off`, similar to how it works with [rules](./rules.md). When it's specified, any problem reported from the decorator is treated according to the configured severity. Setting `severity: off` disables the decorator altogether. Generally, it's not necessary to specify `severity` for decorator configuration except for troubleshooting purposes.

## Custom decorators

If you don't see the decorator you need, you can create your own decorators using [custom plugins](./custom-plugins/custom-decorators.md).
