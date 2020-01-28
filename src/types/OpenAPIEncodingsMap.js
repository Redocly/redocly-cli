// eslint-disable-next-line import/no-cycle
import OpenAPIEncoding from './OpenAPIEncoding';

export default {
  name: 'OpenAPIEncodingsMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIEncoding;
    });
    return props;
  },
};
