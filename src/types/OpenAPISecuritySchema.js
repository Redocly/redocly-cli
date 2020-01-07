import OpenAPIFlows from './OpenAPIFlows';

export default {
  name: 'OpenAPISecuritySchema',
  properties: {
    type: null,
    description: null,
    name: null,
    in: null,
    scheme: null,
    bearerFormat: null,
    openIdConnectUrl: null,
    flows: OpenAPIFlows,
  },
  resolvableScalars: [
    'description',
  ],
};
