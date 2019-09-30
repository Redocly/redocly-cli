export const OpenAPILicense = {
  name: 'OpenAPILicense',
  allowedFields: [
    'name',
    'url',
  ],
};

export const OpenAPIContact = {
  name: 'OpenAPIContact',
  allowedFields: [
    'name',
    'url',
    'email',
  ],
};

export const OpenAPIInfo = {
  name: 'OpenAPIInfo',
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
