/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../error';

import isRuleEnabled from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPIInfo extends AbstractRule {
  static get ruleName() {
    return 'info';
  }

  validators() {
    return {
      title: (node, ctx) => (!node || !node.title ? createErrorMissingRequiredField('title', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      version: (node, ctx) => (!node || !node.version ? createErrorMissingRequiredField('version', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      description: () => null,
      termsOfService: () => null,
    };
  }

  OpenAPIInfo() {
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

module.exports = ValidateOpenAPIInfo;
