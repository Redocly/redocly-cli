/* eslint-disable import/no-cycle */
import OpenAPIServer from './OpenAPIServer';
import OpenAPIOperation from './OpenAPIOperation';
import { OpenAPIParameter } from './OpenAPIParameter';

export const OpenAPIPathItem = {
  name: 'OpenAPIPath',
  allowedFields: [
    'summary',
    'description',
    'servers',
    'parameters',
  ],
  properties: {
    parameters: OpenAPIParameter,
    get: OpenAPIOperation,
    put: OpenAPIOperation,
    post: OpenAPIOperation,
    delete: OpenAPIOperation,
    options: OpenAPIOperation,
    head: OpenAPIOperation,
    patch: OpenAPIOperation,
    trace: OpenAPIOperation,
    servers: OpenAPIServer,
  },
};

export const OpenAPIPaths = {
  name: 'OpenAPIPaths',
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIPathItem;
    });
    return props;
  },
};
