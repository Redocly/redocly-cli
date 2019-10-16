import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import { OpenAPIHeaderMap } from './OpenAPIHeader';
import { OpenAPILinkMap } from './OpenAPILink';

export const OpenAPIResponse = {
  name: 'OpenAPIResponse',
  isIdempotent: true,

  properties: {
    description: null,
    content: OpenAPIMediaTypeObject,
    headers: OpenAPIHeaderMap,
    links: OpenAPILinkMap,
  },
};

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
