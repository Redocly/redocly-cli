import OpenAPISchemaMap from './OpenAPISchemaMap';
import OpenAPISecuritySchemaMap from './OpenAPISecuritySchema';
import { OpenAPIExampleMap } from './OpenAPIExampleMap';
import { OpenAPIParameterMap } from './OpenAPIParameterMap';
import { OpenAPIResponseMap } from './OpenAPIResponseMap';
import { OpenAPIHeaderMap } from './OpenAPIHeaderMap';
import { OpenAPILinkMap } from './OpenAPILinkMap';
import { OpenAPICallbackMap } from './OpenAPICallbackMap';
import { OpenAPIRequestBodyMap } from './OpenAPIRequestBodyMap';

export default {
  name: 'OpenAPIComponents',
  isIdempotent: true,
  properties: {
    schemas: OpenAPISchemaMap,
    responses: OpenAPIResponseMap,
    parameters: OpenAPIParameterMap,
    examples: OpenAPIExampleMap,
    requestBodies: OpenAPIRequestBodyMap,
    headers: OpenAPIHeaderMap,
    securitySchemes: OpenAPISecuritySchemaMap,
    links: OpenAPILinkMap,
    callbacks: OpenAPICallbackMap,
  },
};
