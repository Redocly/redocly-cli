import { OpenAPIHeader } from './OpenAPIHeader';

export const OpenAPIHeaderMap = {
  name: 'OpenAPIHeaderMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIHeader;
    });
    return props;
  },
};

export default OpenAPIHeaderMap;
