module.exports = (types) => ({
  ...types,
  OpenAPIParameter: {
    ...types.OpenAPIParameter,
    // enable dynamic type resolution for OpenAPIParameter and return either OpenAPIParameterWithAllOf or regular OpenAPIParameter
    resolveType: (node) => (node.allOf ? 'OpenAPIParameterWithAllOf' : 'OpenAPIParameter'),
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
