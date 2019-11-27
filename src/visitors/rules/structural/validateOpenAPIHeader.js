/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch, createErrorMutuallyExclusiveFields } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIHeader extends AbstractVisitor {
  static get ruleName() {
    return 'header';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      required(node, ctx) {
        if (node && node.required && typeof node.required !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (node && node.in && node.in === 'path' && !(node.required || node.required !== true)) {
          return createError('If the parameter location is "path", this property is REQUIRED and its value MUST be true.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        }
        return null;
      },
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      allowEmptyValue(node, ctx) {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      explode(node, ctx) {
        if (node && node.explode && typeof node.explode !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      allowReserved(node, ctx) {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      example(node, ctx) {
        if (node.example && node.examples) return createErrorMutuallyExclusiveFields(['example', 'examples'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      examples(node, ctx) {
        if (node.example && node.examples) return createErrorMutuallyExclusiveFields(['examples', 'example'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPIHeader() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIHeader;
