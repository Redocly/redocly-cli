export const OpenAPILicense = {
  name: 'OpenAPILicense',
  isIdempotent: true,
  allowedFields: [
    'name',
    'url',
  ],
};

export const OpenAPIContact = {
  name: 'OpenAPIContact',
  isIdempotent: true,
  allowedFields: [
    'name',
    'url',
    'email',
  ],
};

export const OpenAPIInfo = {
  name: 'OpenAPIInfo',
  isIdempotent: true,
  allowedFields: [
    'title',
    'version',
    'description',
    'termsOfService',
  ],
  properties: {
    license: OpenAPILicense,
    contact: OpenAPIContact,
  },
};
