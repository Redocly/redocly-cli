import createError, { createErrrorFieldTypeMismatch, createErrorMutuallyExclusiveFields } from '../error';
import { OpenAPIExampleMap } from './OpenAPIExample';
// eslint-disable-next-line import/no-cycle
import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import OpenAPISchemaObject from './OpenAPISchema';

export const OpenAPIHeader = {
  validators: {
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx);
        return null;
      };
    },
    required() {
      return (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx);
        if (node && node.in && node.in === 'path' && !(node.required || node.required !== true)) {
          return createError('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx);
        }
        return null;
      };
    },
    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx);
        return null;
      };
    },
    allowEmptyValue() {
      return (node, ctx) => {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx);
        return null;
      };
    },
    explode() {
      return (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx);
        return null;
      };
    },
    allowReserved() {
      return (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx);
        return null;
      };
    },
    example() {
      return (node, ctx) => {
        if (node.example && node.examples) return createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx);
        return null;
      };
    },
    examples() {
      return (node, ctx) => {
        if (node.example && node.examples) return createErrorMutuallyExclusiveFields(['examples', 'example'], node, ctx);
        return null;
      };
    },
  },
  properties: {
    schema: OpenAPISchemaObject,
    content: OpenAPIMediaTypeObject,
    examples: OpenAPIExampleMap,
  },
};

export const OpenAPIHeaderMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIHeader;
    });
    return props;
  },
};
