/* eslint-disable import/no-cycle */

import { OpenAPIResponseMap } from './OpenAPIResponseMap';
import { OpenAPIParameter } from './OpenAPIParameter';
import OpenAPIServer from './OpenAPIServer';
import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import { OpenAPICallbackMap } from './OpenAPICallbackMap';
import { OpenAPIRequestBody } from './OpenAPIRequestBody';

export default {
  name: 'OpenAPIOperation',
  isIdempotent: false,
  properties: {
    tags: null,
    summary: null,
    description: null,
    operationId: null,
    deprecated: null,
    security: null,
    externalDocs: OpenAPIExternalDocumentation,
    parameters: OpenAPIParameter,
    requestBody: OpenAPIRequestBody,
    responses: OpenAPIResponseMap,
    callbacks: OpenAPICallbackMap,
    // TODO:
    // security() {},
    servers: OpenAPIServer,
  },
};
