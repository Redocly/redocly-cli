/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIContact extends AbstractVisitor {
  static get ruleName() {
    return 'contact';
  }

  get validators() {
    return {
      name(node, ctx) {
        return (node && node.name) && typeof node.name !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      url(node, ctx) {
        return (node && node.url) && typeof node.url !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      email(node, ctx) {
        return (node && node.url) && typeof node.url !== 'string' ? createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },

    };
  }

  OpenAPIContact() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIContact;
