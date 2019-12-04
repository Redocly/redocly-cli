/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIServerVariable extends AbstractVisitor {
  static get ruleName() {
    return 'server-variable';
  }

  get validators() {
    return {
      default(node, ctx) {
        if (!node || !node.default) return createErrorMissingRequiredField('default', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.default !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string'
          ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      enum(node, ctx) {
        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return createErrrorFieldTypeMismatch('array', node, ctx);
          if (node.type && node.enum.filter((item) => typeof item !== 'string').length !== 0) return createError('All values of "enum" field must be strings', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIServerVariable() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIServerVariable;
