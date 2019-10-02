/* eslint-disable import/no-cycle */

import { OpenAPIResponseMap } from './OpenAPIResponse';
import { OpenAPIParameter } from './OpenAPIParameter';
import OpenAPIServer from './OpenAPIServer';
import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import { OpenAPICallbackMap } from './OpenAPICallback';
import { OpenAPIRequestBody } from './OpenAPIRequestBody';

export default {
  name: 'OpenAPIOperation',
  isIdempotent: false,
  allowedFields: [
    'tags',
    'summary',
    'description',
    'operationId',
    'responses',
    'deprecated',
    'security',
  ],
  properties: {
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
