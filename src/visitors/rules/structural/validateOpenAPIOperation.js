/* eslint-disable class-methods-use-this */
import createError, { createErrrorFieldTypeMismatch, createErrorMissingRequiredField } from '../../../error';

import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPIOperation extends AbstractVisitor {
  static get ruleName() {
    return 'operation';
  }

  get validators() {
    return {
      tags(node, ctx) {
        if (!node || !node.tags) return null;

        const errors = [];

        if (node && node.tags && !Array.isArray(node.tags)) {
          return createErrrorFieldTypeMismatch('array.', node, ctx, { fromRule: this.rule, severity: this.config.level });
        }

        for (let i = 0; i < node.tags.length; i++) {
          if (typeof node.tags[i] !== 'string') {
            ctx.path.push(i);
            errors.push(createError('Items of the tags array must be strings in the Open API Operation object.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level }));
            ctx.path.pop();
          }
        }

        return errors;
      },
      summary(node, ctx) {
        if (node && node.summary && typeof node.summary !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      operationId(node, ctx) {
        if (node && node.operationId && typeof node.operationId !== 'string') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
      responses: (node, ctx) => (!node.responses ? createErrorMissingRequiredField('responses', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null),
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return createErrrorFieldTypeMismatch('string', node, ctx, { fromRule: this.rule, severity: this.config.level });
        return null;
      },
    };
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPIOperation;
