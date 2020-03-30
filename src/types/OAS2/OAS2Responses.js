import { OAS2Response } from './OAS2Response';

export const OAS2Responses = {
  name: 'OAS2Responses',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OAS2Response;
    });
    return props;
  },
};

export default OAS2Responses;
