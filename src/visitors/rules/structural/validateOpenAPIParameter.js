/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField, createErrrorFieldTypeMismatch, createErrorMutuallyExclusiveFields } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIParameter extends AbstractVisitor {
  static get ruleName() {
    return 'parameter';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (!node) return null;
        if (!node.name) return createErrorMissingRequiredField('name', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.name !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      in(node, ctx) {
        if (!node) return null;
        if (!node.in) return createErrorMissingRequiredField('in', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (typeof node.in !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (!['query', 'header', 'path', 'cookie'].includes(node.in)) return createError("The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'", node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level });
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      required(node, ctx) {
        if (node && node.required && typeof node.required !== 'boolean') return createErrrorFieldTypeMismatch('boolean', node, ctx, { fromRule: this.rule, severity: this.config.level });
        if (node && node.in && node.in === 'path' && node.required !== true) {
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
      style(node, ctx) {
        if (node && node.style && typeof node.style !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
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
      schema(node, ctx) {
        if (node.schema && node.content) {
          return createErrorMutuallyExclusiveFields(['schema', 'content'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
      content(node, ctx) {
        if (node.schema && node.content) {
          return createErrorMutuallyExclusiveFields(['content', 'schema'], node, ctx, { fromRule: this.rule, severity: this.config.level });
        }
        return null;
      },
    };
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIParameter;
