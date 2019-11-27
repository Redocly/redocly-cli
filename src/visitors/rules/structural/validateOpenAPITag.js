/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPITag extends AbstractVisitor {
  static get ruleName() {
    return 'tag';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (!node.name) return createErrorMissingRequiredField('name', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (node && node.name && typeof node.name !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPITag() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPITag;
