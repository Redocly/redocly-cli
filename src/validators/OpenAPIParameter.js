import createError from '../error';

import OpenAPISchemaObject from './OpenAPISchema';
import { OpenAPIMediaTypeObject } from './OpenAPIMediaObject';
import { OpenAPIExampleMap } from './OpenAPIExample';

export const OpenAPIParameter = {
  name: 'OpenAPIParameter',
  validators: {
    name() {
      return (node, ctx) => {
        if (!node) return null;
        if (!node.name || typeof node.name !== 'string') return createError('name is required and must be a string', node, ctx);
        return null;
      };
    },
    in() {
      return (node, ctx) => {
        if (!node) return null;
        if (!node.in) return createError('in field is required for Parameter object', node, ctx);
        if (typeof node.in !== 'string') return createError('in field must be a string', node, ctx);
        if (!['query', 'header', 'path', 'cookie'].includes(node.in)) return createError("in value can be only one of: 'query', 'header', 'path', 'cookie'", node, ctx);
        return null;
      };
    },
    description() {
      return (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createError('description field must be a string', node, ctx);
        return null;
      };
    },
    required() {
      return (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') return createError('required field must be a boolean', node, ctx);
        if (node && node.in && node.in === 'path' && node.required !== true) {
          return createError('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx);
        }
        return null;
      };
    },
    deprecated() {
      return (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createError('deprecated field must be a boolean', node, ctx);
        return null;
      };
    },
    allowEmptyValue() {
      return (node, ctx) => {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return createError('allowEmptyValue field must be a boolean', node, ctx);
        return null;
      };
    },
    style() {
      return (node, ctx) => {
        if (node && node.style && typeof node.style !== 'string') {
          return createError('The style field must be a string for Parameter object', node, ctx);
        }
        return null;
      };
    },
    explode() {
      return (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') return createError('explode field must be a boolean', node, ctx);
        return null;
      };
    },
    allowReserved() {
      return (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return createError('allowReserved field must be a boolean', node, ctx);
        return null;
      };
    },
    example() {
      return (node, ctx) => {
        if (node.example && node.examples) return createError('The example field is mutually exclusive of the examples field.', node, ctx);
        return null;
      };
    },
    examples() {
      return (node, ctx) => {
        if (node.example && node.examples) return createError('The examples field is mutually exclusive of the example field.', node, ctx);
        return null;
      };
    },
    schema() {
      return (node, ctx) => {
        if (node.schema && node.content) {
          return createError('A parameter MUST contain either a schema property, or a content property, but not both.', node, ctx);
        }
        return null;
      };
    },
    content() {
      return (node, ctx) => {
        if (node.schema && node.content) {
          return createError('A parameter MUST contain either a schema property, or a content property, but not both.', node, ctx);
        }
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

export const OpenAPIParameterMap = {
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIParameter;
    });
    return props;
  },
};
