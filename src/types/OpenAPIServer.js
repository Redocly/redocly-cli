const OpenAPIServerVariable = {
  name: 'OpenAPIServerVariable',
  isIdempotent: true,
  allowedFields: [
    'default',
    'description',
    'enum',
  ],
};

const OpenAPIServerVariableMap = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIServerVariable;
    });
    return props;
  },
};

const OpenAPIServer = {
  name: 'OpenAPIServer',
  isIdempotent: true,
  allowedFields: [
    'url',
    'description',
  ],
  properties: {
    variables() {
      return OpenAPIServerVariableMap;
    },
  },
};

export default OpenAPIServer;
