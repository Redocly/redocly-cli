import OpenAPIServer from './OpenAPIServer';

export const OpenAPILink = {
  name: 'OpenAPILink',
  isIdempotent: true,
  allowedFields: [
    'operationRef',
    'operationId',
    'parameters',
    'description',
    'requestBody',
  ],
  properties: {
    server: OpenAPIServer,
  },
};

export const OpenAPILinkMap = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPILink;
    });
    return props;
  },
};
