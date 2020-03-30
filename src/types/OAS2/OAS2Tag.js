import { OAS2ExternalDocumentation } from './OAS2ExternalDocumentation';

export const OAS2Tag = {
  name: 'OAS2Tag',
  isIdempotent: true,
  properties: {
    name: null,
    description: null,
    externalDocs: OAS2ExternalDocumentation,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OAS2Tag;
