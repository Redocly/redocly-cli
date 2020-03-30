/* eslint-disable import/no-cycle */
import OpenAPIPath from './OpenAPIPath';

export const OpenAPIPaths = {
  name: 'OpenAPIPaths',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIPath;
    });
    return props;
  },
};

export default OpenAPIPaths;
