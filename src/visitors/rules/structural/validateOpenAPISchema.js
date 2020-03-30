import { getClosestString } from '../../../utils';


class ValidateOpenAPISchema {
  static get rule() {
    return 'oas3-schema/schema';
  }

  get validators() {
    return {
      title(node, ctx) {
        if (node && node.title) {
          if (!(typeof node.title === 'string')) return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      multipleOf(node, ctx) {
        if (node && node.multipleOf) {
          if (typeof node.multipleOf !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
          if (node.multipleOf < 0) return ctx.createError('Value of multipleOf must be greater or equal to zero', 'value');
        }
        return null;
      },
      maximum(node, ctx) {
        if (node && node.maximum && typeof node.maximum !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      exclusiveMaximum(node, ctx) {
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      minimum(node, ctx) {
        if (node && node.minimum && typeof node.minimum !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      exclusiveMinimum(node, ctx) {
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      maxLength(node, ctx) {
        if (node && node.maxLength) {
          if (typeof node.maxLength !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
          if (node.maxLength < 0) return ctx.createError('Value of maxLength must be greater or equal to zero.', 'value');
        }
        return null;
      },
      minLength(node, ctx) {
        if (node && node.minLength) {
          if (typeof node.minLength !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
          if (node.minLength < 0) return ctx.createError('Value of minLength must be greater or equal to zero.', 'value');
        }
        return null;
      },
      pattern(node, ctx) {
        if (node && node.pattern) {
          // TODO: add regexp validation.
          if (typeof node.pattern !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        }
        return null;
      },
      maxItems(node, ctx) {
        if (node && node.maxItems) {
          if (typeof node.maxItems !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
          if (node.maxItems < 0) return ctx.createError('Value of maxItems must be greater or equal to zero. You can`t have negative amount of something.', 'value');
        }
        return null;
      },
      minItems(node, ctx) {
        if (node && node.minItems) {
          if (typeof node.minItems !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
          if (node.minItems < 0) return ctx.createError('Value of minItems must be greater or equal to zero. You can`t have negative amount of something.', 'value');
        }
        return null;
      },
      uniqueItems(node, ctx) {
        if (node && node.uniqueItems) {
          if (typeof node.uniqueItems !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        }
        return null;
      },
      maxProperties(node, ctx) {
        if (node && node.maxProperties) {
          if (typeof node.maxProperties !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
          if (node.maxProperties < 0) return ctx.createError('Value of maxProperties must be greater or equal to zero. You can`t have negative amount of something.', 'value');
        }
        return null;
      },
      minProperties(node, ctx) {
        if (node && node.minProperties) {
          if (typeof node.minProperties !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
          if (node.minProperties < 0) return ctx.createError('Value of minProperties must be greater or equal to zero. You can`t have negative amount of something.', 'value');
        }
        return null;
      },
      required(node, ctx) {
        if (node && node.required) {
          if (!Array.isArray(node.required)) return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value');
          if (node.required.filter((item) => typeof item !== 'string').length !== 0) return ctx.createError('All values of "required" field must be strings', 'value');
        }
        return null;
      },
      enum(node, ctx) {
        const errors = [];

        if (node && node.enum) {
          if (!Array.isArray(node.enum)) return [ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'), 'value')];
        }
        return errors;
      },
      type(node, ctx) {
        const errors = [];
        if (node.type && node.type && typeof node.type !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        if (node.type && !['string', 'object', 'array', 'integer', 'number', 'boolean'].includes(node.type)) {
          const possibleAlternate = getClosestString(node.type, ['string', 'object', 'array', 'integer', 'number', 'boolean']);
          errors.push(ctx.createError('Object type can be one of following only: "string", "object", "array", "integer", "number", "boolean".', 'value', { possibleAlternate }));
        }
        return errors;
      },
      items(node, ctx) {
        if (node && node.items && Array.isArray(node.items)) return ctx.createError('Value of items must not be an array. It must be a Schema object', 'value');
        return null;
      },
      additionalProperties: () => null,
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      format(node, ctx) {
        if (node && node.format && typeof node.format !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      nullable(node, ctx) {
        if (node && node.nullable && typeof node.nullable !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      readOnly(node, ctx) {
        if (node && node.readOnly && typeof node.readOnly !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      writeOnly(node, ctx) {
        if (node && node.writeOnly && typeof node.writeOnly !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
    };
  }

  OpenAPISchema() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPISchema;
