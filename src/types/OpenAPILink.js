import OpenAPIServer from './OpenAPIServer';

export const OpenAPILink = {
  name: 'OpenAPILink',
  isIdempotent: true,
  properties: {
    operationRef: null,
    operationId: null,
    parameters: null,
    description: null,
    requestBody: null,
    server: OpenAPIServer,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OpenAPILink;
