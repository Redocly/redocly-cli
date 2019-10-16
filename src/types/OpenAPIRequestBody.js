import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';

export const OpenAPIRequestBody = {
  name: 'OpenAPIRequestBody',
  isIdempotent: true,
  properties: {
    description: null,
    required: null,
    content: OpenAPIMediaTypeObject,
  },
};

export const OpenAPIRequestBodyMap = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIRequestBody;
    });
    return props;
  },
};
