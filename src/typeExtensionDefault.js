export const extension = {
  OpenAPIRoot: {
    properties: {
      blabla: null,
      defaultParameterSchema: 'OpenAPISchema',
      customerSupport: 'OpenAPICustomField',
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
};

export default extension;
