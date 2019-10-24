import OpenAPIServerVariable from './OpenAPIServerVariable';

export default {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIServerVariable;
    });
    return props;
  },
};
