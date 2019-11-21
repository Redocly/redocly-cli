module.exports = {
  define: {
    OpenAPICustomField: {
      name: 'OpenAPICustomField',
      isIdempotent: true,
      properties: {
        id: null,
        contact: 'OpenAPIContact',
      },
    },
  },
  extend: {
    OpenAPIRoot: {
      properties: {
        blabla: null,
        defaultParameterSchema: 'OpenAPISchema',
        customerSupport: 'OpenAPICustomField',
      },
    },
    OpenAPIParameter: {
      properties: {
        allOf: 'OpenAPIParameter',
      },
    },
  },
};
