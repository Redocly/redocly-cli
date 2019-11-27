/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIResponse extends AbstractVisitor {
  static get ruleName() {
    return 'response';
  }

  get validators() {
    return {
      description(node, ctx) {
        return !node.description ? createErrorMissingRequiredField('description', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
    };
  }

  OpenAPIResponse() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIResponse;
