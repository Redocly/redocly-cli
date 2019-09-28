import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';

export default {
  name: 'OpenAPITag',
  allowedFields: [
    'name',
    'description',
  ],
  properties: {
    externalDocs: OpenAPIExternalDocumentation,
  },
};
