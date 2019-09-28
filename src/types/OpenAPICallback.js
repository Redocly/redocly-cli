/* eslint-disable import/no-cycle */
import { OpenAPIPathItem } from './OpenAPIPaths';

export const OpenAPICallback = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIPathItem;
    });
    return props;
  },
};


export const OpenAPICallbackMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPICallback;
    });
    return props;
  },
};
