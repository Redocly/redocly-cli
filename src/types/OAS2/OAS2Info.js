import OAS2Contact from './OAS2Contact';
import OAS2License from './OAS2License';


export const OAS2Info = {
  name: 'OAS2Info',
  isIdempotent: true,
  properties: {
    title: null,
    version: null,
    description: null,
    termsOfService: null,
    license: OAS2License,
    contact: OAS2Contact,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OAS2Info;
