import { OAS2PathItem } from './OAS2PathItem';

export const OAS2Paths = {
  name: 'OAS2Paths',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OAS2PathItem;
    });
    return props;
  },
};
export default OAS2Paths;
