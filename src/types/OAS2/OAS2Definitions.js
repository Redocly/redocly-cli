import { OAS2Schema } from './OAS2Schema';

export const OAS2Definitions = {
  name: 'OAS2Definitions',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OAS2Schema;
    });
    return props;
  },
};

export default OAS2Definitions;
