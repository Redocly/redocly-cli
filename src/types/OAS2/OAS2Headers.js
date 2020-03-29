import { OAS2Header } from './OAS2Header';

export const OAS2Headers = {
  name: 'OAS2Headers',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OAS2Header;
    });
    return props;
  },
};

export default OAS2Headers;
