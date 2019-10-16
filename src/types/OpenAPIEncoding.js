// eslint-disable-next-line import/no-cycle
import { OpenAPIHeaderMap } from './OpenAPIHeader';

export default {
  name: 'OpenAPIEncoding',
  isIdempotent: true,
  properties: {
    contentType: null,
    style: null,
    explode: null,
    allowReserved: null,
    headers: OpenAPIHeaderMap,
  },
};
