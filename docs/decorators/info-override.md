# info-override

Extends the info object with the designated value.

## API design principles

Sometimes developers generate OpenAPI and the info object need to be improved after the fact.
This generally happens when you have no permission to edit the source.
This decorator provides a way to "overlay" a new info section over the source so that as the source changes you won't lose your modifications.


## Configuration

|Option|Type|Description|
|---|---|---|
|_additionalProperties_|any|**REQUIRED.** Any properties from the OpenAPI info object.|

Example of a configuration:

```yaml
decorators:
  info-description-override:
    title: Updated title
    x-meta: Custom metadata
```

## Examples

![info-override](https://user-images.githubusercontent.com/3975738/214524591-328377a5-9004-4222-8040-57e49e07604a.png)

## Related decorators

- [info-description-override](./info-description-override.md)
- [operation-description-override](./operation-description-override.md)
- [tag-description-override](./tag-description-override.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/info-description-override.ts)
- [Blog post about Overlays](../../../blog/openapi-overlays.md)
