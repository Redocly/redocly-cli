/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIInfo extends AbstractVisitor {
  static get ruleName() {
    return 'info';
  }

  get validators() {
    return {
      title(node, ctx) {
        return !node || !node.title ? createErrorMissingRequiredField('title', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      version(node, ctx) {
        return !node || !node.version ? createErrorMissingRequiredField('version', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      description() {
        return null;
      },
      termsOfService() {
        return null;
      },
    };
  }

  OpenAPIInfo() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIInfo;
