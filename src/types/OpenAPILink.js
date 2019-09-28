import OpenAPIServer from './OpenAPIServer';

export const OpenAPILink = {
  name: 'OpenAPILink',
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
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPILink;
    });
    return props;
  },
};
