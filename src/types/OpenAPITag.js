import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';

export default {
  name: 'OpenAPITag',
  isIdempotent: true,
  allowedFields: [
    'name',
    'description',
  ],
  properties: {
    externalDocs: OpenAPIExternalDocumentation,
  },
};
