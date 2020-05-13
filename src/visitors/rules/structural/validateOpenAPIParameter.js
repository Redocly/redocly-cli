class ValidateOpenAPIParameter {
  static get rule() {
    return 'oas3-schema/parameter';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (!node) return null;
        if (!node.name) return ctx.createError(ctx.messageHelpers.missingRequiredField('name'), 'key');
        if (typeof node.name !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      in(node, ctx) {
        if (!node) return null;
        if (!node.in) return ctx.createError(ctx.messageHelpers.missingRequiredField('in'), 'key');
        if (typeof node.in !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        if (!['query', 'header', 'path', 'cookie'].includes(node.in)) {
          return ctx.createError(
            "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'", 'value',
          );
        }
        return null;
      },
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
        if (node && node.in && node.in === 'path' && node.required !== true) {
          return ctx.createError(
            'If the parameter location is "path", this property is REQUIRED and its value MUST be true.',
            'value',
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
      style(node, ctx) {
        if (node && node.style && typeof node.style !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
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
      schema(node, ctx) {
        if (node.schema && node.content) {
          return ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['schema', 'content']), 'key');
        }
        return null;
      },
      content(node, ctx) {
        if (node.schema && node.content) {
          return ctx.createError(ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['content', 'schema']), 'key');
        }
        return null;
      },
    };
  }

  OpenAPIParameter(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIParameter;
