# tag-description-override

Replaces the tag description with the designated Markdown in the corresponding file.

## API design principles

Sometimes developers generate OpenAPI and the descriptions need to be improved after the fact.
This generally happens when you have no permission to edit the source.
This decorator provides a way to "overlay" a new description over the source so that as the source changes you won't lose your modifications.


## Configuration

|Option|Type|Description|
|---|---|---|
|tagNames|object|**REQUIRED.** List of key values pairs with tag names as the key and paths to Markdown files as the value.|

Example of a configuration:

```yaml
decorators:
  tag-description-override:
    tagNames:
      planet: ./my-planet-description.md
      star: ./my-star-description.md
```

## Examples

![tag-description-override](https://user-images.githubusercontent.com/1161871/140233049-e36a1bcc-4267-41b8-b646-6159a282d54a.png)


See a repository with [info, operation, and tag description overrides](https://github.com/redocly-demo/decorators-demo).

## Related decorators

- [info-description-override](./info-description-override.md)
- [operation-description-override](./operation-description-override.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/tag-description-override.ts)
- [Blog post about Overlays](../../../blog/openapi-overlays.md)
