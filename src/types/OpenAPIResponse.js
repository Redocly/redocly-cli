import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import { OpenAPIHeaderMap } from './OpenAPIHeader';
import { OpenAPILinkMap } from './OpenAPILink';

export const OpenAPIResponse = {
  name: 'OpenAPIResponse',
  allowedFields: [
    'description',
  ],
  properties: {
    content: OpenAPIMediaTypeObject,
    headers: OpenAPIHeaderMap,
    links: OpenAPILinkMap,
  },
};

export const OpenAPIResponseMap = {
  name: 'OpenAPIResponseMap',
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIResponse;
    });
    return props;
  },
};
