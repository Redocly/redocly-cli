/* eslint-disable import/no-cycle */
import { OpenAPIPathItem } from './OpenAPIPath';

export const OpenAPICallback = {
  name: 'OpenAPICallback',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIPathItem;
    });
    return props;
  },
};

export default OpenAPICallback;
