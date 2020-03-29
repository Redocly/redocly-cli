/* eslint-disable import/no-cycle */
import { OAS2Schema } from './OAS2Schema';

const OAS2SchemaMap = {
  name: 'OAS2SchemaMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OAS2Schema;
    });
    return props;
  },
};

export default OAS2SchemaMap;
