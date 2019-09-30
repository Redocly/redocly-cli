import OpenAPIFlows from './OpenAPIFlows';

export default {
  name: 'OpenAPISecuritySchema',
  allowedFields: [
    'type',
    'description',
    'name',
    'in',
    'scheme',
    'bearerFormat',
    'flows',
    'openIdConnectUrl',
  ],
  properties: {
    flows: OpenAPIFlows,
  },
};
