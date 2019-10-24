module.exports = {
  extension: {
    OpenAPIRoot: {
      properties: {
        blabla: null,
        defaultParameterSchema: 'OpenAPISchema',
        customerSupport: 'OpenAPICustomField',
      },
    },

    OpenAPIParameter: {
      properties: {
        allOf: null,
      },
    },

    OpenAPICustomField: {
      name: 'OpenAPICustomField',
      isIdempotent: true,
      properties: {
        id: null,
        contact: 'OpenAPIContact',
      },
    },
  },
};
