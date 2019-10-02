import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';

export const OpenAPIRequestBody = {
  name: 'OpenAPIRequestBody',
  isIdempotent: true,
  allowedFields: [
    'description',
    'content',
    'required',
  ],
  properties: {
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
