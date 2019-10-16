export const OpenAPILicense = {
  name: 'OpenAPILicense',
  isIdempotent: true,
  properties: {
    name: null,
    url: null,
  },
};

export const OpenAPIContact = {
  name: 'OpenAPIContact',
  isIdempotent: true,
  properties: {
    name: null,
    url: null,
    email: null,
  },
};

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
};
