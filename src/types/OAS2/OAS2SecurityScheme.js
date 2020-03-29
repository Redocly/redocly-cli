import { OAS2Scopes } from './OAS2Scopes';

export const OAS2SecurityScheme = {
  name: 'OAS2SecurityScheme',
  isIdempotent: true,
  properties: {
    scopes: OAS2Scopes,

    type: null,
    description: null,
    name: null,
    in: null,
    flow: null,
    authorizationUrl: null,
    tokenUrl: null,
  },
};

export default OAS2SecurityScheme;
