/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField } from '../../../error';

import { isUrl } from '../../../utils';
import isRuleEnabled from '../../utils';
import AbstractRule from '../../utils/AbstractRule';

class ValidateOpenAPILicense extends AbstractRule {
  static get ruleName() {
    return 'license';
  }

  validators() {
    return {
      name: (node, ctx) => (!node || !node.name ? createErrorMissingRequiredField('name', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      url: (node, ctx) => (node && node.url && !isUrl(node.url) ? createError('The url field must be a valid URL.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level }) : null),
    };
  }

  OpenAPILicense() {
    return {
      onEnter: (node, definition, ctx) => {
        if (!node) return [];
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this.config, vals[i])) {
            if (Object.keys(node).indexOf(vals[i]) !== -1) ctx.path.push(vals[i]);
            const res = validators[vals[i]](node, ctx, this.config);
            if (res) {
              if (Array.isArray(res)) result.push(...res);
              else result.push(res);
            }
            if (Object.keys(node).indexOf(vals[i]) !== -1) ctx.path.pop();
          }
        }
        return result;
      },
    };
  }
}

module.exports = ValidateOpenAPILicense;
