module.exports = (types) => ({
  ...types,
  OpenAPIParameter: {
    ...types.OpenAPIParameter,
    resolveType: (node) => (node.allOf ? 'OpenAPIParameterWithAllOf' : 'OpenAPIParameter'),
  },
  OpenAPIParameterWithAllOf: {
    name: 'OpenAPIParameterWithAllOf',
    properties: {
      allOf: 'OpenAPIParameterPartial',
    },
  },
  OpenAPIParameterPartial: {
    ...types.OpenAPIParameter,
    name: 'OpenAPIParameterPartial',
  },
});
