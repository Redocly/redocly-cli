/* eslint-disable class-methods-use-this */
import createError from '../error';

import { isRuleEnabled } from './utils';

class ValidateOpenAPIOperation {
  constructor(config) {
    this.config = config;
  }

  static get ruleName() {
    return 'validateOpenAPIOperation';
  }

  validators() {
    return {
      tags: (node, ctx) => {
        if (node && node.tags && !Array.isArray(node.tags)) {
          return createError('The tags field must be an array in the Open API Operation object.', node, ctx);
        }
        if (node && node.tags && node.tags.filter((item) => typeof item !== 'string').length > 0) {
          return createError('Items of the tags array must be strings in the Open API Operation object.', node, ctx);
        }
        return null;
      },
      summary: (node, ctx) => {
        if (node && node.summary && typeof node.summary !== 'string') return createError('The summary field must be a string', node, ctx);
        return null;
      },
      description: (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createError('The description field must be a string', node, ctx);
        return null;
      },
      operationId: (node, ctx) => {
        if (node && node.operationId && typeof node.operationId !== 'string') return createError('The operationId field must be a string', node, ctx);
        return null;
      },
      responses: (node, ctx) => (!node.responses ? createError('Operation must include responses section', node, ctx, 'key') : null),
      deprecated: (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createError('The deprecated field must be a string', node, ctx);
        return null;
      },
    };
  }

  OpenAPIOperation() {
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

module.exports = ValidateOpenAPIOperation;
