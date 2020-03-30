import OpenAPIContact from './OpenAPIContact';
import OpenAPILicense from './OpenAPILicense';


export const OpenAPIInfo = {
  name: 'OpenAPIInfo',
  isIdempotent: true,
  properties: {
    title: null,
    version: null,
    description: null,
    termsOfService: null,
    license: OpenAPILicense,
    contact: OpenAPIContact,
  },
  resolvableScalars: [
    'description',
  ],
};

export default OpenAPIInfo;
