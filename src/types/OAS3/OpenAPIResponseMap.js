import OpenAPIResponse from './OpenAPIResponse';

export const OpenAPIResponseMap = {
  name: 'OpenAPIResponseMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIResponse;
    });
    return props;
  },
};

export default OpenAPIResponseMap;
