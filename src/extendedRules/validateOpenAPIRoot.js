/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../error';

import { isRuleEnabled } from './utils';

class ValidateOpenAPIRoot {
  constructor(config) {
    this.config = config;
  }

  static get ruleName() {
    return 'validateOpenAPIRoot';
  }

  validators() {
    return {
      openapi: (node, ctx) => {
        if (node && !node.openapi) return createErrorMissingRequiredField('openapi', node, ctx);
        return null;
      },
      info: (node, ctx) => {
        if (node && !node.info) return createErrorMissingRequiredField('info', node, ctx);
        return null;
      },
      paths: (node, ctx) => {
        if (node && !node.paths) return createErrorMissingRequiredField('paths', node, ctx);
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

module.exports = ValidateOpenAPIRoot;
