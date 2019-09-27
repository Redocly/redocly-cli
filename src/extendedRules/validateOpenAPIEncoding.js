/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch } from '../error';

import { isRuleEnabled } from './utils';

class ValidateOpenAPIEncoding {
  constructor(config) {
    this.config = config;
  }

  static get ruleName() {
    return 'validateOpenAPIEncoding';
  }

  validators() {
    return {
      contentType: (node, ctx) => {
        if (node && node.contentType && typeof node.contentType !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      },
      style: (node, ctx) => {
        if (node && node.style && typeof node.style !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      },
      explode: (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') {
          return createErrrorFieldTypeMismatch('boolean', node, ctx);
        }
        return null;
      },
      allowReserved: (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
          return createErrrorFieldTypeMismatch('boolean', node, ctx);
        }
        return null;
      },
    };
  }

  OpenAPIEncoding() {
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

module.exports = ValidateOpenAPIEncoding;
