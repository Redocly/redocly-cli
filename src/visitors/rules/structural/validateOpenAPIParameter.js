class ValidateOpenAPIParameter {
  static get rule() {
    return 'oas3-schema/parameter';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (!node) return null;
        if (!node.name) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('name'),
            reportOnKey: true,
          });
        }
        if (typeof node.name !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      in(node, ctx) {
        if (!node) return null;
        if (!node.in) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('in'),
            reportOnKey: true,
          });
        }
        if (typeof node.in !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        if (!['query', 'header', 'path', 'cookie'].includes(node.in)) {
          return ctx.report({
            message: "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
          });
        }
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      required(node, ctx) {
        if (node && node.required && typeof node.required !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        if (node && node.in && node.in === 'path' && node.required !== true) {
          return ctx.report({
            message: 'If the parameter location is "path", this property is REQUIRED and its value MUST be true.',
          });
        }
        return null;
      },
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      allowEmptyValue(node, ctx) {
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      style(node, ctx) {
        if (node && node.style && typeof node.style !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      explode(node, ctx) {
        if (node && node.explode && typeof node.explode !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      allowReserved(node, ctx) {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      example(node, ctx) {
        if (node.example && node.examples) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['example', 'examples']),
            reportOnKey: true,
          });
        }
        return null;
      },
      examples(node, ctx) {
        if (node.example && node.examples) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['examples', 'example']),
            reportOnKey: true,
          });
        }
        return null;
      },
      schema(node, ctx) {
        if (node.schema && node.content) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['schema', 'content']),
            reportOnKey: true,
          });
        }
        return null;
      },
      content(node, ctx) {
        if (node.schema && node.content) {
          return ctx.report({
            message: ctx.messageHelpers.mutuallyExclusiveFieldsMessageHelper(['content', 'schema']),
            reportOnKey: true,
          });
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
