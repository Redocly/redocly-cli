# Custom visitors

### Concepts

#### Type definitions

`openapi-cli` in its core has a type tree which defines the structure of the OpenAPI definition. `openapi-cli` then uses it to do type-aware traversal of OpenAPI Document.

Type tree is built from top level `Types` which can link to child types.

TBD

This tree can be modified.

#### Rules (visitors)

TBD

### Extending type definitions

Type tree can be extended using js file which is passed as `typeExtension` parameter in the config. It should follow such pattern (similar to reducers):

```js
module.exports = (types) => ({
  ...types,
  OpenAPIParameter: {
    ...types.OpenAPIParameter,
    // enable dynamic type resolution for OpenAPIParameter and return either OpenAPIParameterWithAllOf or regular OpenAPIParameter
    resolveType: node => (node.allOf ? 'OpenAPIParameterWithAllOf' : 'OpenAPIParameter'),
  },
  // define OpenAPIParameterWithAllOf
  OpenAPIParameterWithAllOf: {
    properties: {
      allOf: 'OpenAPIParameterPartial',
    },
  },
  // define OpenAPIParameterPartial
  OpenAPIParameterPartial: {
    ...types.OpenAPIParameter,
  },
});
```

### Adding custom rules


TBD