# remove-unused-components

Removes unused components from the bundle output.

In this context, "used" means that a component defined in the `components` object is referenced elsewhere in the API document with `$ref`.

## API design principles

This decorator is intended to help security-focused enterprises prevent data leaks. Components can leak schemas, parameters, and other properties that may be unused in the exposed APIs, but used internally elsewhere.

However, your API document may contain common components used in other APIs. If that describes your use-case, please avoid using this decorator.

## Configuration

Example of a configuration:

```yaml
decorators:
  remove-unused-components: on
```

## Examples

Read the article on [no-unused-components](../rules/no-unused-components.md#examples) rule to see examples.

## Related decorators

- [filter-out](./filter-out.md)
- [remove-x-internal](./remove-x-internal.md)

## Resources

- The Redocly CLI `bundle` command supports an option called `--remove-unused-components`. Use it to automatically clean up any unused components from your OpenAPI document while bundling it.
- [Components docs](https://redocly.com/docs/openapi-visual-reference/components/)
