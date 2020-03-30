import { OAS2SecurityScheme } from './OAS2SecurityScheme';

export const OAS2SecurityDefinitions = {
  name: 'OAS2SecurityDefinitions',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OAS2SecurityScheme;
    });
    return props;
  },
};

export default OAS2SecurityDefinitions;
