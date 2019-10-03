/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../../error';

import { isRuleEnabled } from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIOperation extends AbstractRule {
  static get ruleName() {
    return 'validateOpenAPIOperation';
  }

  validators() {
    return {
      tags: (node, ctx) => {
        if (node && node.tags && !Array.isArray(node.tags)) {
          return createErrrorFieldTypeMismatch('array.', node, ctx, { severity: this.config.level });
        }
        if (node && node.tags && node.tags.filter((item) => typeof item !== 'string').length > 0) {
          return createError('Items of the tags array must be strings in the Open API Operation object.', node, ctx, { target: 'value', severity: this.config.level });
        }
        return null;
      },
      summary: (node, ctx) => {
        if (node && node.summary && typeof node.summary !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level });
        return null;
      },
      description: (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level });
        return null;
      },
      operationId: (node, ctx) => {
        if (node && node.operationId && typeof node.operationId !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level });
        return null;
      },
      responses: (node, ctx) => (!node.responses ? createErrorMissingRequiredField('responses', node, ctx, { severity: this.config.level }) : null),
      deprecated: (node, ctx) => {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createErrrorFieldTypeMismatch('string', node, ctx, { severity: this.config.level });
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
