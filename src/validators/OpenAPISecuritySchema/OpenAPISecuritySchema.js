import createError from '../../error';

import OpenAPIFlows from './OpenAPIFlows';

export default {
  validators: {
    type() {
      return (node, ctx) => {
        if (!node.type) return createError('The type field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.type !== 'string') return createError('The type field must be a string for the OpenAPI Security Scheme object', node, ctx);
        if (!['apiKey', 'http', 'oauth2', 'openIdConnect'].includes(node.type)) return createError('The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') return createError('The description field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    name() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (typeof node.name !== 'string') return createError('The name field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    in() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (!node.in) return createError('The in field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.in !== 'string') return createError('The in field must be a string for the OpenAPI Security Scheme object', node, ctx);
        if (!['query', 'header', 'cookie'].includes(node.in)) return createError('The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    scheme() {
      return (node, ctx) => {
        if (node.type !== 'http') return null;
        if (!node.scheme) return createError('The scheme field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.scheme !== 'string') return createError('The scheme field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    bearerFormat() {
      return (node, ctx) => {
        if (node.type !== 'http') return null;
        if (!node.bearerFormat) return createError('The bearerFormat field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.scheme !== 'string') return createError('The bearerFormat field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    flows() {
      return (node, ctx) => {
        if (node.type !== 'oauth2') return null;
        if (!node.flows) return createError('The flows field is required for the Open API Security Scheme object', node, ctx);
        return null;
      };
    },
    openIdConnectUrl() {
      return (node, ctx) => {
        if (node.type !== 'openIdConnect') return null;
        if (!node.openIdConnectUrl) return createError('The openIdConnectUrl field is required for the OpenAPI Security Scheme object', node, ctx);
        if (typeof node.openIdConnectUrl !== 'string') return createError('The openIdConnectUrl field must be a string for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
  },
  properties: {
    flows: OpenAPIFlows,
  },
};
