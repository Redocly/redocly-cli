import { OpenAPIMediaTypeObject } from './OpenAPIMediaTypeObject';

export const OpenAPIRequestBody = {
  name: 'OpenAPIRequestBody',
  isIdempotent: true,
  properties: {
    description: null,
    required: null,
    content: OpenAPIMediaTypeObject,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OpenAPIRequestBody;
