module.exports = (name, defaultDefinition) => {
  switch (name) {
    case 'OpenAPIParameter':
      return {
        ...defaultDefinition,
        resolveType: (node) => (node.allOf ? 'OpenAPIParameterWithAllOf' : 'OpenAPIParameter'),
      };
    case 'OpenAPIParameterWithAllOf':
      return {
        name: 'OpenAPIParameterWithAllOf',
        properties: {
          allOf: 'OpenAPIParameter',
        },
      };
    case 'OpenAPIRoot':
      return {
        ...defaultDefinition,
        properties: {
          ...defaultDefinition.properties,
          blabla: null,
          defaultParameterSchema: 'OpenAPISchema',
          customerSupport: 'OpenAPICustomField',
        },
      };
    case 'OpenAPICustomField':
      return {
        name: 'OpenAPICustomField',
        isIdempotent: true,
        properties: {
          id: null,
          contact: 'OpenAPIContact',
        },
      };
    default:
      return defaultDefinition;
  }
};
