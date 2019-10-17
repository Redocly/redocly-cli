/* eslint-disable class-methods-use-this */
import { createErrorMutuallyExclusiveFields } from '../../../error';

import isRuleEnabled from '../../utils';
import AbstractRule from '../../utils/AbstractRule';

class ValidateOpenAPIMediaObject extends AbstractRule {
  static get ruleName() {
    return 'media-object';
  }

  validators() {
    return {
      example: (node, ctx) => (node.example && node.examples ? createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      examples: (node, ctx) => (node.example && node.examples ? createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
    };
  }

  OpenAPIMediaObject() {
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

module.exports = ValidateOpenAPIMediaObject;
