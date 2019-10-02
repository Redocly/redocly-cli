// eslint-disable-next-line import/no-cycle
import { OpenAPIHeaderMap } from './OpenAPIHeader';

export default {
  name: 'OpenAPIEncoding',
  isIdempotent: true,
  allowedFields: [
    'contentType',
    'style',
    'explode',
    'allowReserved',
  ],
  properties: {
    headers: OpenAPIHeaderMap,
  },
};
