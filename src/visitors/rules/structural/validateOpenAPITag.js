/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import isRuleEnabled from '../../utils';
import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPITag extends AbstractVisitor {
  static get ruleName() {
    return 'tag';
  }

  validators() {
    return {
      name: (node, ctx) => {
        if (!node.name) return createErrorMissingRequiredField('name', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (node && node.name && typeof node.name !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      description: (node, ctx) => {
        if (node && node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPITag() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this, vals[i])) {
            ctx.path.push(vals[i]);
            const res = validators[vals[i]](node, ctx, this.config);
            if (res) {
              if (Array.isArray(res)) result.push(...res);
              else result.push(res);
            }
            ctx.path.pop();
          }
        }
        return result;
      },
    };
  }
}

module.exports = ValidateOpenAPITag;
