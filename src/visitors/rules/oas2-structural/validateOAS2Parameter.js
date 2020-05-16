class ValidateOAS2Parameter {
  static get rule() {
    return 'oas2-schema/parameter';
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
        if (!['query', 'header', 'path', 'body', 'formData'].includes(node.in)) {
          return ctx.report({
            message: "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
          });
        }
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
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

      schema(node, ctx) {
        if (node.in && node.in === 'body' && !node.schema) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('schema'),
            reportOnKey: true,
          });
        }

        if (!(node.in && node.in === 'body') && node.schema) {
          return ctx.report({
            message: 'Schema field may be present only if parameter is in "body".',
            reportOnKey: true,
          });
        }
        return null;
      },

      type(node, ctx) {
        if (node.in && node.in === 'body' && node.type) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.type && typeof node.type !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },

      format(node, ctx) {
        if (node.in && node.in === 'body' && node.format) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.format && typeof node.format !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },

      allowEmptyValue(node, ctx) {
        if (node.in && node.in === 'body' && node.allowEmptyValue) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },

      items(node, ctx) {
        if (node.in && node.in === 'body' && node.items) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }

        if (!(node.type && node.type === 'array') && node.items) {
          return ctx.report({
            message: '"Items" field may be present only if type of parameter is "array".',
            reportOnKey: true,
          });
        }

        if (node.type && node.type === 'array' && !node.items) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('items'),
            reportOnKey: true,
          });
        }

        return null;
      },

      pattern(node, ctx) {
        if (node.in && node.in === 'body' && node.pattern) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.pattern && typeof node.pattern !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      maximum(node, ctx) {
        if (node.in && node.in === 'body' && node.maximum) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.maximum && typeof node.maximum !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      minimum(node, ctx) {
        if (node.in && node.in === 'body' && node.minimum) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.minimum && typeof node.minimum !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      maxLength(node, ctx) {
        if (node.in && node.in === 'body' && node.maxLength) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.maxLength && typeof node.maxLength !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      minLength(node, ctx) {
        if (node.in && node.in === 'body' && node.minLength) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.minLength && typeof node.minLength !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      maxItems(node, ctx) {
        if (node.in && node.in === 'body' && node.maxItems) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.maxItems && typeof node.maxItems !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      minItems(node, ctx) {
        if (node.in && node.in === 'body' && node.minItems) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.minItems && typeof node.minItems !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      multipleOf(node, ctx) {
        if (node.in && node.in === 'body' && node.multipleOf) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.multipleOf && typeof node.multipleOf !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      exclusiveMaximum(node, ctx) {
        if (node.in && node.in === 'body' && node.exclusiveMaximum) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      exclusiveMinimum(node, ctx) {
        if (node.in && node.in === 'body' && node.exclusiveMinimum) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      uniqueItems(node, ctx) {
        if (node.in && node.in === 'body' && node.uniqueItems) {
          return ctx.report({
            message: 'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          });
        }
        if (node && node.uniqueItems && typeof node.uniqueItems !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
    };
  }

  OAS2Parameter(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2Parameter;
