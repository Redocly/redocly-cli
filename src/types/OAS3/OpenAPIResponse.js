import { OpenAPIMediaTypeObject } from './OpenAPIMediaTypeObject';
import { OpenAPIHeaderMap } from './OpenAPIHeaderMap';
import { OpenAPILinkMap } from './OpenAPILinkMap';

export const OpenAPIResponse = {
  name: 'OpenAPIResponse',
  isIdempotent: true,

  properties: {
    description: null,
    content: OpenAPIMediaTypeObject,
    headers: OpenAPIHeaderMap,
    links: OpenAPILinkMap,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OpenAPIResponse;
