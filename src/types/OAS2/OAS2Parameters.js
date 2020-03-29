import { OAS2Parameter } from './OAS2Parameter';

export const OAS2Parameters = {
  name: 'OAS2Parameters',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OAS2Parameter;
    });
    return props;
  },
};

export default OAS2Parameters;
