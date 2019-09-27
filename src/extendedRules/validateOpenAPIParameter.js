/* eslint-disable class-methods-use-this */
import createError from '../error';

import { isRuleEnabled } from './utils';

class ValidateOpenAPIParameter {
  constructor(config) {
    this.config = config;
  }

  static get ruleName() {
    return 'validateOpenAPIParameter';
  }

  validators() {
    return {
      name: (node, ctx) => {
        if (!node) return null;
        if (!node.name || typeof node.name !== 'string') return createError('name is required and must be a string', node, ctx);
        return null;
      },
      in: (node, ctx) => {
        if (!node) return null;
        if (!node.in) return createError('in field is required for Parameter object', node, ctx);
        if (typeof node.in !== 'string') return createError('in field must be a string', node, ctx);
        if (!['query', 'header', 'path', 'cookie'].includes(node.in)) return createError("in value can be only one of: 'query', 'header', 'path', 'cookie'", node, ctx);
        return null;
      },
      description: (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createError('description field must be a string', node, ctx);
        return null;
      },
      required: (node, ctx) => {
        if (node && node.required && typeof node.required !== 'boolean') return createError('required field must be a boolean', node, ctx);
        if (node && node.in && node.in === 'path' && node.required !== true) {
          return createError('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx);
        }
        return null;
      },
      deprecated: (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createError('deprecated field must be a boolean', node, ctx);
        return null;
      },
      allowEmptyValue: (node, ctx) => {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return createError('allowEmptyValue field must be a boolean', node, ctx);
        return null;
      },
      style: (node, ctx) => {
        if (node && node.style && typeof node.style !== 'string') {
          return createError('The style field must be a string for Parameter object', node, ctx);
        }
        return null;
      },
      explode: (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') return createError('explode field must be a boolean', node, ctx);
        return null;
      },
      allowReserved: (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return createError('allowReserved field must be a boolean', node, ctx);
        return null;
      },
      example: (node, ctx) => {
        if (node.example && node.examples) return createError('The example field is mutually exclusive of the examples field.', node, ctx);
        return null;
      },
      examples: (node, ctx) => {
        if (node.example && node.examples) return createError('The examples field is mutually exclusive of the example field.', node, ctx);
        return null;
      },
      schema: (node, ctx) => {
        if (node.schema && node.content) {
          return createError('A parameter MUST contain either a schema property, or a content property, but not both.', node, ctx);
        }
        return null;
      },
      content: (node, ctx) => {
        if (node.schema && node.content) {
          return createError('A parameter MUST contain either a schema property, or a content property, but not both.', node, ctx);
        }
        return null;
      },
    };
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this, vals[i])) {
            const res = validators[vals[i]](node, ctx, this.config);
            if (res) {
              if (Array.isArray(res)) result.push(...res);
              else result.push(res);
            }
          }
        }
        return result;
      },
    };
  }
}

module.exports = ValidateOpenAPIParameter;
