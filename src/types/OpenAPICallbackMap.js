import { OpenAPICallback } from './OpenAPICallback';

export const OpenAPICallbackMap = {
  name: 'OpenAPICallbackMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPICallback;
    });
    return props;
  },
};

export default OpenAPICallback;
