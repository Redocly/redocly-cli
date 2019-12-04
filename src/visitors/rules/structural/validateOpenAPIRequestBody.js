/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIRequestBody extends AbstractVisitor {
  static get ruleName() {
    return 'request-body';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string.', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      content(node, ctx) {
        if (node && !node.content) {
          return createErrorMissingRequiredField('content', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      required(node, ctx) {
        if (node && node.required && typeof node.required !== 'boolean') {
          return createErrrorFieldTypeMismatch('boolean.', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIRequestBody() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIRequestBody;
