/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch } from '../../error';

import { isRuleEnabled } from '../utils';

class ValidateOpenAPIPath {
  constructor(config) {
    this.config = config;
  }

  static get ruleName() {
    return 'validateOpenAPIPath';
  }

  validators() {
    return {
      summary: (node, ctx) => (node && node.summary && typeof node.summary !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx) : null),
      description: (node, ctx) => (node && node.description && typeof node.description !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx) : null),
      servers: (node, ctx) => (node && node.servers && !Array.isArray(node.servers)
        ? createErrrorFieldTypeMismatch('array', node, ctx) : null),
      parameters: (node, ctx) => {
        if (!node || !node.parameters) return null;
        if (!Array.isArray(node.parameters)) {
          return createErrrorFieldTypeMismatch('array', node, ctx);
        }
        if ((new Set(node.parameters)).size !== node.parameters.length) {
          return createError('parameters must be unique in the Path Item object', node, ctx);
        }
        return null;
      },
    };
  }

  OpenAPIPath() {
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

module.exports = ValidateOpenAPIPath;
