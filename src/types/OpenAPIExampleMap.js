import OpenAPIExample from './OpenAPIExample';

export const OpenAPIExampleMap = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIExample;
    });
    return props;
  },
};

export default OpenAPIExampleMap;
