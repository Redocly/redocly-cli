
class ValidateOpenAPIHeader {
  static get rule() {
    return 'oas3-schema/header';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      required(node, ctx) {
        if (node && node.required && typeof node.required !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        if (node && node.in && node.in === 'path' && !(node.required || node.required !== true)) {
          return ctx.createError(
            'If the parameter location is "path", this property is REQUIRED and its value MUST be true.', 'value',
          );
        }
        return null;
      },
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      allowEmptyValue(node, ctx) {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      explode(node, ctx) {
        if (node && node.explode && typeof node.explode !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      allowReserved(node, ctx) {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      example(node, ctx) {
        if (node.example && node.examples) {
          return ctx.createError(
            ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['example', 'examples']), 'key',
          );
        }
        return null;
      },
      examples(node, ctx) {
        if (node.example && node.examples) {
          return ctx.createError(
            ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['examples', 'example']), 'key',
          );
        }
        return null;
      },
    };
  }

  OpenAPIHeader(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIHeader;
