class ValidateOpenAPIOperation {
  static get rule() {
    return 'oas3-schema/operation';
  }

  get validators() {
    return {
      tags(node, ctx) {
        if (!node || !node.tags) return null;

        const errors = [];

        if (node && node.tags && !Array.isArray(node.tags)) {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value');
        }

        for (let i = 0; i < node.tags.length; i++) {
          if (typeof node.tags[i] !== 'string') {
            ctx.path.push(i);
            errors.push(ctx.createError('Items of the tags array must be strings in the Open API Operation object.', 'value'));
            ctx.path.pop();
          }
        }

        return errors;
      },
      summary(node, ctx) {
        if (node && node.summary && typeof node.summary !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      operationId(node, ctx) {
        if (node && node.operationId && typeof node.operationId !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      responses: (node, ctx) => (!node.responses ? ctx.createError(ctx.messageHelpers.missingRequiredField('responses'), 'key') : null),
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
    };
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIOperation;
