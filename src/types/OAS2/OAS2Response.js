import { OAS2Schema } from './OAS2Schema';
import { OAS2Headers } from './OAS2Headers';
import { OAS2Example } from './OAS2Example';

export const OAS2Response = {
  name: 'OAS2Response',
  isIdempotent: true,

  properties: {
    description: null,
    schema: OAS2Schema,
    headers: OAS2Headers,
    examples: OAS2Example,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OAS2Response;
