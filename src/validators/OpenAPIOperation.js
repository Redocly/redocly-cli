/* eslint-disable import/no-cycle */
import createError from '../error';

import { OpenAPIResponseMap } from './OpenAPIResponse';
import { OpenAPIParameter } from './OpenAPIParameter';
import OpenAPIServer from './OpenAPIServer';
import OpenAPIExternalDocumentation from './OpenAPIExternalDocumentation';
import { OpenAPICallbackMap } from './OpenAPICallback';
import { OpenAPIRequestBody } from './OpenAPIRequestBody';

export default {
  validators: {
    tags() {
      return (node, ctx) => {
        if (node && node.tags && !Array.isArray(node.tags)) {
          return createError('The tags field must be an array in the Open API Operation object.', node, ctx);
        }
        if (node && node.tags && node.tags.filter((item) => typeof item !== 'string').length > 0) {
          return createError('Items of the tags array must be strings in the Open API Operation object.', node, ctx);
        }
        return null;
      };
    },
    summary() {
      return (node, ctx) => {
        if (node && node.summary && typeof node.summary !== 'string') return createError('The summary field must be a string', node, ctx);
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createError('The description field must be a string', node, ctx);
        return null;
      };
    },
    operationId() {
      return (node, ctx) => {
        if (node && node.operationId && typeof node.operationId !== 'string') return createError('The operationId field must be a string', node, ctx);
        return null;
      };
    },
    responses() {
      return (node, ctx) => (!node.responses ? createError('Operation must include responses section', node, ctx) : null);
    },
    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createError('The deprecated field must be a string', node, ctx);
        return null;
      };
    },
    security() {
      return () => null;
    },
  },
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
