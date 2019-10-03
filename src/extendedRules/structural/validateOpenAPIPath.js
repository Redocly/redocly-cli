/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch } from '../../error';

import { isRuleEnabled } from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIPath extends AbstractRule {
  static get ruleName() {
    return 'validateOpenAPIPath';
  }

  validators() {
    return {
      summary: (node, ctx) => (node && node.summary && typeof node.summary !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level }) : null),
      description: (node, ctx) => (node && node.description && typeof node.description !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level }) : null),
      servers: (node, ctx) => (node && node.servers && !Array.isArray(node.servers)
        ? createErrrorFieldTypeMismatch('array', node, ctx, { severity: this.config.level }) : null),
      parameters: (node, ctx) => {
        if (!node || !node.parameters) return null;
        if (!Array.isArray(node.parameters)) {
          return createErrrorFieldTypeMismatch('array', node, ctx, { severity: this.config.level });
        }
        if ((new Set(node.parameters)).size !== node.parameters.length) {
          return createError('parameters must be unique in the Path Item object', node, ctx, { target: 'value', severity: this.config.level });
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
