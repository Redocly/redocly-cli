# info-description-override

Replaces the info description with the designated Markdown in the corresponding file.

## API design principles

Sometimes developers generate OpenAPI and the descriptions need to be improved after the fact.
This generally happens when you have no permission to edit the source.
This decorator provides a way to "overlay" a new description over the source so that as the source changes you won't lose your modifications.


## Configuration

|Option|Type|Description|
|---|---|---|
|filePath|string|**REQUIRED.** The relative path to a Markdown file containing the desired info description.|

Example of a configuration:

```yaml
decorators:
  info-description-override:
    filePath: ./my-custom-description.md
```

## Examples

![info-description-override](https://user-images.githubusercontent.com/1161871/140232772-502fe663-8af7-4da6-a345-21b8067129bc.png)


See a repository with [info, operation, and tag description overrides](https://github.com/redocly-demo/decorators-demo).

## Related decorators

- [operation-description-override](./operation-description-override.md)
- [tag-description-override](./tag-description-override.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/info-description-override.ts)
- [Blog post about Overlays](../../../blog/openapi-overlays.md)
