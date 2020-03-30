import { OpenAPIMediaObject } from './OpenAPIMediaObject';

export const OpenAPIMediaTypeObject = {
  name: 'OpenAPIMediaTypeObject',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIMediaObject;
    });
    return props;
  },
};

export default OpenAPIMediaTypeObject;
