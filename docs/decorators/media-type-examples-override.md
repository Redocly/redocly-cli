# media-type-examples-override

Replaces the examples in the corresponding file.

## API design principles

Sometimes developers generate OpenAPI and the examples need to be added or improved after the fact.
This generally happens when you have no permission to edit the source.
This decorator provides a way to "overlay" a new examples over the source so that as the source changes you won't lose your modifications.

## Configuration

|Option|Type| Description                                                                                                                                                  |
|---|---|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
|operationIds|object| **REQUIRED.** Object consisting of operationIds as keys, and object as a value that containing the request and responses keys and example`s paths as values. |

Example of a configuration:

```yaml
decorators:
  media-type-examples-override:
    operationIds:
      PostPets:
        request:
          application/json: ./pet-examples.yaml
        responses:
          '200':
            application/json: ./pet-examples.yaml
          '400':
            application/json: ./pet-errors-examples.yaml
```

## Examples 

Given this definition with example:

```yaml
openapi: 3.0.0
info:
  version: 1.0.0
  title: Swagger Petstore
paths:
  '/GETUser/{userId}':
    summary: getPet
    get:
      operationId: getUserByName
      responses:
        200:
          description: okay
          content:
            application/json:
              examples:
                pet:
                  value:
                    name: test name
```

Given the file `./pet-examples.yaml` with content:

```yaml
Cat:
  value:
    name: example
```

Given this configuration:

```yaml
decorators:
  media-type-examples-override:
    operationIds:
      PostPets:
        responses:
          '200': ./pet-examples.yaml
```

The result of the bundle command

```yaml
openapi: 3.0.0
info:
  version: 1.0.0
  title: Swagger Petstore
paths:
  '/GETUser/{userId}':
    summary: getPet
    get:
      operationId: getUserByName
      responses:
        200:
          description: okay
          content:
            application/json:
              examples:
                Cat:
                  value:
                    name: example
```
## Related decorators

- [operation-description-override](./operation-description-override.md)
- [tag-description-override](./tag-description-override.md)
- [tag-description-override](./tag-description-override.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/info-description-override.ts)
- [Blog post about Overlays](../../../blog/openapi-overlays.md)
