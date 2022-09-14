# operation-description-override

Replaces the operation description with the designated Markdown in the corresponding file.

## API design principles

Sometimes developers generate OpenAPI and the descriptions need to be improved after the fact.
This generally happens when you have no permission to edit the source.
This decorator provides a way to "overlay" a new description over the source so that as the source changes you won't lose your modifications.


## Configuration

|Option|Type|Description|
|---|---|---|
|operationIds|object|**REQUIRED.** List of key values pairs with operationIds as the key and paths to Markdown files as the value.|

Example of a configuration:

```yaml
decorators:
  operation-description-override:
    operationIds:
      updatePet: ./my-custom-description.md
      createPet: ./add-a-pet.md
```

## Examples

![operation-description-override](https://user-images.githubusercontent.com/1161871/140233186-50d4cf13-46bc-4414-8231-35f87179825e.png)


See a repository with [info, operation, and tag description overrides](https://github.com/redocly-demo/decorators-demo).

## Related decorators

- [info-description-override](./info-description-override.md)
- [tag-description-override](./tag-description-override.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/operation-description-override.ts)
- [Blog post about Overlays](../../../blog/openapi-overlays.md)
