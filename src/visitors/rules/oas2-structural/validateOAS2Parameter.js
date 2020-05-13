class ValidateOAS2Parameter {
  static get rule() {
    return 'oas2-schema/parameter';
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
        if (!['query', 'header', 'path', 'body', 'formData'].includes(node.in)) {
          return ctx.createError(
            "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
            'value',
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

      schema(node, ctx) {
        if (node.in && node.in === 'body' && !node.schema) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('schema'), 'key');
        }

        if (!(node.in && node.in === 'body') && node.schema) {
          return ctx.createError('Schema field may be present only if parameter is in "body".', 'key');
        }
        return null;
      },

      type(node, ctx) {
        if (node.in && node.in === 'body' && node.type) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.type && typeof node.type !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },

      format(node, ctx) {
        if (node.in && node.in === 'body' && node.format) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.format && typeof node.format !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },

      allowEmptyValue(node, ctx) {
        if (node.in && node.in === 'body' && node.allowEmptyValue) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.allowEmptyValue && typeof node.allowEmptyValue !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },

      items(node, ctx) {
        if (node.in && node.in === 'body' && node.items) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }

        if (!(node.type && node.type === 'array') && node.items) {
          return ctx.createError('"Items" field may be present only if type of parameter is "array".', 'key');
        }

        if (node.type && node.type === 'array' && !node.items) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('items'), 'key');
        }

        return null;
      },

      pattern(node, ctx) {
        if (node.in && node.in === 'body' && node.pattern) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.pattern && typeof node.pattern !== 'string') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      maximum(node, ctx) {
        if (node.in && node.in === 'body' && node.maximum) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.maximum && typeof node.maximum !== 'number') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        }
        return null;
      },
      minimum(node, ctx) {
        if (node.in && node.in === 'body' && node.minimum) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.minimum && typeof node.minimum !== 'number') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        }
        return null;
      },
      maxLength(node, ctx) {
        if (node.in && node.in === 'body' && node.maxLength) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.maxLength && typeof node.maxLength !== 'number') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        }
        return null;
      },
      minLength(node, ctx) {
        if (node.in && node.in === 'body' && node.minLength) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.minLength && typeof node.minLength !== 'number') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        }
        return null;
      },
      maxItems(node, ctx) {
        if (node.in && node.in === 'body' && node.maxItems) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.maxItems && typeof node.maxItems !== 'number') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        }
        return null;
      },
      minItems(node, ctx) {
        if (node.in && node.in === 'body' && node.minItems) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.minItems && typeof node.minItems !== 'number') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        }
        return null;
      },
      multipleOf(node, ctx) {
        if (node.in && node.in === 'body' && node.multipleOf) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.multipleOf && typeof node.multipleOf !== 'number') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        }
        return null;
      },
      exclusiveMaximum(node, ctx) {
        if (node.in && node.in === 'body' && node.exclusiveMaximum) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      exclusiveMinimum(node, ctx) {
        if (node.in && node.in === 'body' && node.exclusiveMinimum) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      uniqueItems(node, ctx) {
        if (node.in && node.in === 'body' && node.uniqueItems) {
          return ctx.createError(
            'This field is allowed only if the parameter not in "body". In such case, use Schema object instead',
          );
        }
        if (node && node.uniqueItems && typeof node.uniqueItems !== 'boolean') {
          return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
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
