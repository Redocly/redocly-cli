/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField } from '../../error';

import { isUrl } from '../../utils';
import { isRuleEnabled } from '../utils';
import AbstractRule from '../utils/AbstractRule';

class ValidateOpenAPILicense extends AbstractRule {
  static get ruleName() {
    return 'validateOpenAPILicense';
  }

  validators() {
    return {
      name: (node, ctx) => (!node || !node.name ? createErrorMissingRequiredField('name', node, ctx, this.config.level) : null),
      url: (node, ctx) => (node && node.url && !isUrl(node.url) ? createError('The url field must be a valid URL', node, ctx, this.config.level) : null),
    };
  }

  OpenAPILicense() {
    return {
      onEnter: (node, definition, ctx) => {
        const result = [];
        const validators = this.validators();
        const vals = Object.keys(validators);
        for (let i = 0; i < vals.length; i += 1) {
          if (isRuleEnabled(this.config, vals[i])) {
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

module.exports = ValidateOpenAPILicense;
