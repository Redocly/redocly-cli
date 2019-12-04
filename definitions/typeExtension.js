module.exports = (types) => ({
  ...types,
  OpenAPIParameter: {
    ...(types.OpenAPIParameter && types.OpenAPIParameter),
    properties: {
      ...(types.OpenAPIParameter && types.OpenAPIParameter.properties),
      allOf: null,
    },
    resolveType: (node) => (node.allOf ? 'OpenAPIParameterWithAllOf' : 'OpenAPIParameter'),
  },
  OpenAPIParameterWithAllOf: {
    name: 'OpenAPIParameterWithAllOf',
    properties: {
      allOf: 'OpenAPIParameter',
    },
  },
  OpenAPIRoot: {
    ...(types.OpenAPIRoot && types.OpenAPIRoot),
    properties: {
      ...(types.OpenAPIRoot && types.OpenAPIRoot.properties),
      blabla: null,
      defaultParameterSchema: 'OpenAPISchema',
      customerSupport: 'OpenAPICustomField',
    },
  },
  OpenAPICustomField: {
    name: 'OpenAPICustomField',
    properties: {
      id: null,
      contact: 'OpenAPIContact',
    },
  },
});
