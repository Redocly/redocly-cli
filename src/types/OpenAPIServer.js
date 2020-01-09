import OpenAPIServerVariableMap from './OpenAPIServerVariableMap';

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
  resolvableScalars: [
    'description',
  ],
};

export default OpenAPIServer;
