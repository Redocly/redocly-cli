/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIRoot extends AbstractVisitor {
  static get ruleName() {
    return 'root';
  }

  get validators() {
    return {
      openapi(node, ctx) {
        if (node && !node.openapi) return createErrorMissingRequiredField('openapi', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      info(node, ctx) {
        if (node && !node.info) return createErrorMissingRequiredField('info', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      paths(node, ctx) {
        if (node && !node.paths) return createErrorMissingRequiredField('paths', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      security: () => null,
    };
  }

  OpenAPIRoot() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIRoot;
