import OpenAPISchemaMap from './OpenAPISchemaMap';
import OpenAPISecuritySchemaMap from './OpenAPISecuritySchema';
import { OpenAPIExampleMap } from './OpenAPIExample';
import { OpenAPIParameterMap } from './OpenAPIParameter';
import { OpenAPIResponseMap } from './OpenAPIResponse';
import { OpenAPIHeaderMap } from './OpenAPIHeader';
import { OpenAPILinkMap } from './OpenAPILink';
import { OpenAPICallbackMap } from './OpenAPICallback';
import { OpenAPIRequestBodyMap } from './OpenAPIRequestBody';

export default {
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
