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
