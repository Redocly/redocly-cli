/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIServer extends AbstractVisitor {
  static get ruleName() {
    return 'server';
  }

  get validators() {
    return {
      url(node, ctx) {
        if (!node || !node.url || typeof node.url !== 'string') return createErrorMissingRequiredField('url', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.url !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string'
          ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
    };
  }

  OpenAPIServer() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIServer;
