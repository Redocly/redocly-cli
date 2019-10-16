/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../error';

import isRuleEnabled from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIRoot extends AbstractRule {
  static get ruleName() {
    return 'root';
  }

  validators() {
    return {
      openapi: (node, ctx) => {
        if (node && !node.openapi) return createErrorMissingRequiredField('openapi', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      info: (node, ctx) => {
        if (node && !node.info) return createErrorMissingRequiredField('info', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      paths: (node, ctx) => {
        if (node && !node.paths) return createErrorMissingRequiredField('paths', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      security: () => null,
    };
  }

  OpenAPIRoot() {
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

module.exports = ValidateOpenAPIRoot;
