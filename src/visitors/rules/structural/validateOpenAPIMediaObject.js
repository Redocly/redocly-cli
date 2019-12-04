/* eslint-disable class-methods-use-this */
import { createErrorMutuallyExclusiveFields } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIMediaObject extends AbstractVisitor {
  static get ruleName() {
    return 'media-object';
  }

  get validators() {
    return {
      example(node, ctx) {
        return node.example && node.examples ? createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      examples(node, ctx) {
        return node.example && node.examples ? createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
    };
  }

  OpenAPIMediaObject() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIMediaObject;
