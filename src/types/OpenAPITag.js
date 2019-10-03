import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';

export default {
  name: 'OpenAPITag',
  isIdempotent: true,
  properties: {
    name: null,
    description: null,
    externalDocs: OpenAPIExternalDocumentation,
  },
};
