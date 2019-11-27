/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField, createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIDiscriminator extends AbstractVisitor {
  static get ruleName() {
    return 'discriminator';
  }

  get validators() {
    return {
      propertyName(node, ctx) {
        if (!(node && node.propertyName)) return createErrorMissingRequiredField('propertyName', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.propertyName !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      mapping(node, ctx) {
        if (node && node.mapping && typeof node.mapping !== 'object') return createErrrorFieldTypeMismatch('Map[string, string]', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (node && node.mapping && Object.keys(node.mapping).filter((key) => typeof node.mapping[key] !== 'string').length !== 0) return createErrrorFieldTypeMismatch('Map[string, string]', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPIDiscriminator() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIDiscriminator;
