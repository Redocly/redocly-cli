/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIPath extends AbstractVisitor {
  static get ruleName() {
    return 'path';
  }

  get validators() {
    return {
      summary(node, ctx) {
        return node && node.summary && typeof node.summary !== 'string'
          ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string'
          ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      servers(node, ctx) {
        return node && node.servers && !Array.isArray(node.servers)
          ? createErrrorFieldTypeMismatch('array', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      parameters(node, ctx) {
        if (!node || !node.parameters) return null;
        if (!Array.isArray(node.parameters)) {
          return createErrrorFieldTypeMismatch('array', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        if ((new Set(node.parameters)).size !== node.parameters.length) {
          return createError('parameters must be unique in the Path Item object', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIPath() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIPath;
