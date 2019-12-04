/* eslint-disable class-methods-use-this */
import { createErrrorFieldTypeMismatch, createErrorMutuallyExclusiveFields } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIExample extends AbstractVisitor {
  static get ruleName() {
    return 'example';
  }

  get validators() {
    return {
      value(node, ctx) {
        if (node.value && node.externalValue) {
          return createErrorMutuallyExclusiveFields(['value', 'externalValue'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      externalValue(node, ctx) {
        if (node.externalValue && typeof node.externalValue !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        if (node.value && node.externalValue) {
          return createErrorMutuallyExclusiveFields(['value', 'externalValue'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      description(node, ctx) {
        if (node.description && typeof node.description !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      summary(node, ctx) {
        if (node.summary && typeof node.summary !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIExample() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIExample;
