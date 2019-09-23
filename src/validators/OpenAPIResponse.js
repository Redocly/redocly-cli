import { createErrorMissingRequiredField } from '../error';

import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import { OpenAPIHeaderMap } from './OpenAPIHeader';
import { OpenAPILinkMap } from './OpenAPILink';

export const OpenAPIResponse = {
  validators: {
    description() {
      return (node, ctx) => (!node.description ? createErrorMissingRequiredField('description', node, ctx) : null);
    },
  },
  properties: {
    content: OpenAPIMediaTypeObject,
    headers: OpenAPIHeaderMap,
    links: OpenAPILinkMap,
  },
};

export const OpenAPIResponseMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIResponse;
    });
    return props;
  },
};
