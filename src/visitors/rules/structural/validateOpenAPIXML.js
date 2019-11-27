/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIXML extends AbstractVisitor {
  static get ruleName() {
    return 'xml';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (node && node.name && typeof node.name !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      namespace(node, ctx) {
        // TODO: add validation that format is uri
        if (node && node.namespace && typeof node.namespace !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      prefix(node, ctx) {
        if (node && node.prefix && typeof node.prefix !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      attribute(node, ctx) {
        if (node && node.attribute && typeof node.attribute !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      wrapped(node, ctx) {
        if (node && node.wrapped && typeof node.wrapped !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPIXML() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIXML;
