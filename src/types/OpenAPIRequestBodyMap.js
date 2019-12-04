import { OpenAPIRequestBody } from './OpenAPIRequestBody';

export const OpenAPIRequestBodyMap = {
  name: 'OpenAPIRequestBodyMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIRequestBody;
    });
    return props;
  },
};

export default OpenAPIRequestBodyMap;
