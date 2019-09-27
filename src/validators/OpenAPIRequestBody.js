import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';

export const OpenAPIRequestBody = {
  name: 'OpenAPIRequestBody',
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
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIRequestBody;
    });
    return props;
  },
};
