/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../error';

import { isUrl } from '../utils';
import { isRuleEnabled } from './utils';

class ValidateOpenAPIExternalDocumentation {
  constructor(config) {
    this.config = config;
  }

  static get ruleName() {
    return 'validateOpenAPIExternalDocumentation';
  }

  validators() {
    return {
      description: (node, ctx) => (node && node.description && typeof node.description !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx) : null),
      url: (node, ctx) => {
        if (node && !node.url) return createErrorMissingRequiredField('url', node, ctx);
        if (!isUrl(node.url)) return createError('url must be a valid URL', node, ctx);
        return null;
      },
    };
  }

  OpenAPIExternalDocumentation() {
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

module.exports = ValidateOpenAPIExternalDocumentation;
