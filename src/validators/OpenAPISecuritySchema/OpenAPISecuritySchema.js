import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../error';

import OpenAPIFlows from './OpenAPIFlows';

export default {
  validators: {
    type() {
      return (node, ctx) => {
        if (!node.type) return createErrorMissingRequiredField('type', node, ctx);
        if (typeof node.type !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        if (!['apiKey', 'http', 'oauth2', 'openIdConnect'].includes(node.type)) return createError('The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    name() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (typeof node.name !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    in() {
      return (node, ctx) => {
        if (node.type !== 'apiKey') return null;
        if (!node.in) return createErrorMissingRequiredField('in', node, ctx);
        if (typeof node.in !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        if (!['query', 'header', 'cookie'].includes(node.in)) return createError('The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object', node, ctx);
        return null;
      };
    },
    scheme() {
      return (node, ctx) => {
        if (node.type !== 'http') return null;
        if (!node.scheme) return createErrorMissingRequiredField('scheme', node, ctx);
        if (typeof node.scheme !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    bearerFormat() {
      return (node, ctx) => {
        if (node.bearerFormat && node.type !== 'http') return createError('The bearerFormat field is applicable only for http', node, ctx);
        if (!node.bearerFormat && node.type === 'http') return createErrorMissingRequiredField('bearerFormat', node, ctx);
        if (node.bearerFormat && typeof node.bearerFormat !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    flows() {
      return (node, ctx) => {
        if (node.type !== 'oauth2') return null;
        if (!node.flows) return createErrorMissingRequiredField('flows', node, ctx);
        return null;
      };
    },
    openIdConnectUrl() {
      return (node, ctx) => {
        if (node.type !== 'openIdConnect') return null;
        if (!node.openIdConnectUrl) return createErrorMissingRequiredField('openIdConnectUrl', node, ctx);
        if (typeof node.openIdConnectUrl !== 'string') return createErrrorFieldTypeMismatch('openIdConnectUrl', node, ctx);
        return null;
      };
    },
  },
  properties: {
    flows: OpenAPIFlows,
  },
};
