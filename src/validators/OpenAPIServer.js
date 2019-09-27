const OpenAPIServerVariable = {
  name: 'OpenAPIServerVariable',
  allowedFields: [
    'default',
    'description',
    'enum',
  ],
};

const OpenAPIServerVariableMap = {
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
