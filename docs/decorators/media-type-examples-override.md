# media-type-examples-override

Replaces the examples in the corresponding file.

## API design principles

Sometimes developers generate OpenAPI and the examples need to be added or improved after the fact.
This generally happens when you have no permission to edit the source.
This decorator provides a way to "overlay" a new examples over the source so that as the source changes you won't lose your modifications.

## Configuration

|Option|Type|Description|
|---|---|---|
|operationIds|object|**REQUIRED.** List of key values pairs with operationIds as the key and paths to Markdown files as the value.|

Example of a configuration:

```yaml
decorators:
  media-type-examples-override:
    operationIds:
      PostPets:
        request:
          application/json: ./pet-examples.yaml
        responses:
          '200': ./pet-examples.yaml
          '400': ./pet-errors-examples.yaml
```

## Examples 

Given this configuration:

```yaml
decorators:
  media-type-examples-override:
    operationIds:
      PostPets:
        responses:
          '200': ./pet-examples.yaml
```
## Related decorators

- [operation-description-override](./operation-description-override.md)
- [tag-description-override](./tag-description-override.md)
- [tag-description-override](./tag-description-override.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/info-description-override.ts)
- [Blog post about Overlays](../../../blog/openapi-overlays.md)
