/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import isRuleEnabled from '../../utils';
import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIServerVariable extends AbstractVisitor {
  static get ruleName() {
    return 'server-variable';
  }

  validators() {
    return {
      default: (node, ctx) => {
        if (!node || !node.default) return createErrorMissingRequiredField('default', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.default !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      description: (node, ctx) => (node && node.description && typeof node.description !== 'string'
        ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      enum: (node, ctx) => {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return createErrrorFieldTypeMismatch('array', node, ctx);
          if (node.type && node.enum.filter((item) => typeof item !== 'string').length !== 0) return createError('All values of "enum" field must be strings', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIServerVariable() {
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

module.exports = ValidateOpenAPIServerVariable;
