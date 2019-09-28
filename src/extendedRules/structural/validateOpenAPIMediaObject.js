/* eslint-disable class-methods-use-this */
import { createErrorMutuallyExclusiveFields } from '../../error';

import { isRuleEnabled } from '../utils';

class ValidateOpenAPIMediaObject {
  constructor(config) {
    this.config = config;
  }

  static get ruleName() {
    return 'validateOpenAPIMediaObject';
  }

  validators() {
    return {
      example: (node, ctx) => (node.example && node.examples ? createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx) : null),
      examples: (node, ctx) => (node.example && node.examples ? createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx) : null),
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

module.exports = ValidateOpenAPIMediaObject;
