# Type Extensions

## Type definitions

`openapi-cli` in its core has a type tree which defines the structure of the OpenAPI definition. `openapi-cli` then uses it to do type-aware traversal of OpenAPI Document.

Type tree is built from top level `Types` which can link to child types.

TBD

This tree can be modified.

## Extending type definitions

Type tree can be extended using by [plugin](./plugin.md) It should follow the following pattern (similar to reducers):

```js
exports.typeExtension = {
  oas3(types) {
    // modify types here
    return {
      ...types,
      // TBD
    };
  },
};
```
