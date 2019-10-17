/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch } from '../../../error';

import isRuleEnabled from '../../utils';
import AbstractRule from '../../utils/AbstractRule';

class ValidateOpenAPIContact extends AbstractRule {
  static get ruleName() {
    return 'contact';
  }

  validators() {
    return {
      name: (node, ctx) => ((node && node.name) && typeof node.name !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      url: (node, ctx) => ((node && node.url) && typeof node.url !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      email: (node, ctx) => ((node && node.url) && typeof node.url !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),

    };
  }

  OpenAPIContact() {
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

module.exports = ValidateOpenAPIContact;
