const OpenAPIServerVariable = {
  name: 'OpenAPIServerVariable',
  isIdempotent: true,
  properties: {
    default: null,
    description: null,
    enum: null,
  },
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
  properties: {
    url: null,
    description: null,
    variables() {
      return OpenAPIServerVariableMap;
    },
  },
};

export default OpenAPIServer;
