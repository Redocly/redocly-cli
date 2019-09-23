import { createErrorMutuallyExclusiveFields, createErrrorFieldTypeMismatch } from '../error';
import OpenAPIServer from './OpenAPIServer';

export const OpenAPILink = {
  validators: {
    operationRef() {
      return (node, ctx) => {
        if (!node || !node.operationRef) return null;
        if (node.operationRef && node.operationId) return createErrorMutuallyExclusiveFields(['operationRef', 'operationId'], node, ctx);
        if (typeof node.operationRef !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    operationId() {
      return (node, ctx) => {
        if (!node || !node.operationId) return null;
        if (node.operationRef && node.operationId) return createErrorMutuallyExclusiveFields(['operationId', 'operationRef'], node, ctx);
        if (typeof node.operationId !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    parameters() {
      return (node, ctx) => {
        if (!node || !node.parameters) return null;
        if (Object.keys(node.parameters).filter((key) => typeof key !== 'string').length > 0) {
          return createErrrorFieldTypeMismatch('Map[string, any]', node, ctx);
        }
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (!node || !node.description) return null;
        if (typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      };
    },
    requestBody() {
      return () => null;
    },
  },
  properties: {
    server: OpenAPIServer,
  },
};

export const OpenAPILinkMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPILink;
    });
    return props;
  },
};
