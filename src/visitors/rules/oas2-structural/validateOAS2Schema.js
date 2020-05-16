import { getClosestString } from '../../../utils';

class ValidateOAS2Schema {
  static get rule() {
    return 'oas2-schema/schema';
  }

  get validators() {
    return {
      title(node, ctx) {
        if (node && node.title) {
          if (!(typeof node.title === 'string')) {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
            });
          }
        }
        return null;
      },
      multipleOf(node, ctx) {
        if (node && node.multipleOf) {
          if (typeof node.multipleOf !== 'number') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
            });
          }
          if (node.multipleOf < 0) {
            return ctx.report({
              message: 'Value of multipleOf must be greater or equal to zero',
            });
          }
        }
        return null;
      },
      maximum(node, ctx) {
        if (node && node.maximum && typeof node.maximum !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      exclusiveMaximum(node, ctx) {
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      minimum(node, ctx) {
        if (node && node.minimum && typeof node.minimum !== 'number') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
        return null;
      },
      exclusiveMinimum(node, ctx) {
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      maxLength(node, ctx) {
        if (node && node.maxLength) {
          if (typeof node.maxLength !== 'number') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
            });
          }
          if (node.maxLength < 0) {
            return ctx.report({
              message: 'Value of maxLength must be greater or equal to zero.',
            });
          }
        }
        return null;
      },
      minLength(node, ctx) {
        if (node && node.minLength) {
          if (typeof node.minLength !== 'number') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
            });
          }
          if (node.minLength < 0) {
            return ctx.report({
              message: 'Value of minLength must be greater or equal to zero.',
            });
          }
        }
        return null;
      },
      pattern(node, ctx) {
        if (node && node.pattern) {
          // TODO: add regexp validation.
          if (typeof node.pattern !== 'string') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
            });
          }
        }
        return null;
      },
      maxItems(node, ctx) {
        if (node && node.maxItems) {
          if (typeof node.maxItems !== 'number') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
            });
          }
          if (node.maxItems < 0) {
            return ctx.report({
              message: 'Value of maxItems must be greater or equal to zero. You can`t have negative amount of something.',
            });
          }
        }
        return null;
      },
      minItems(node, ctx) {
        if (node && node.minItems) {
          if (typeof node.minItems !== 'number') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
            });
          }
          if (node.minItems < 0) {
            return ctx.report({
              message: 'Value of minItems must be greater or equal to zero. You can`t have negative amount of something.',
            });
          }
        }
        return null;
      },
      uniqueItems(node, ctx) {
        if (node && node.uniqueItems) {
          if (typeof node.uniqueItems !== 'boolean') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
            });
          }
        }
        return null;
      },
      maxProperties(node, ctx) {
        if (node && node.maxProperties) {
          if (typeof node.maxProperties !== 'number') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
            });
          }
          if (node.maxProperties < 0) {
            return ctx.report({
              message: 'Value of maxProperties must be greater or equal to zero. You can`t have negative amount of something.',
            });
          }
        }
        return null;
      },
      minProperties(node, ctx) {
        if (node && node.minProperties) {
          if (typeof node.minProperties !== 'number') {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
            });
          }
          if (node.minProperties < 0) {
            return ctx.report({
              message: 'Value of minProperties must be greater or equal to zero. You can`t have negative amount of something.',
            });
          }
        }
        return null;
      },
      required(node, ctx) {
        if (node && node.required) {
          if (!Array.isArray(node.required)) {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
            });
          }
          if (node.required.filter((item) => typeof item !== 'string').length !== 0) {
            return ctx.report({
              message: 'All values of "required" field must be strings',
            });
          }
        }
        return null;
      },
      enum(node, ctx) {
        const errors = [];

        if (node && node.enum) {
          if (!Array.isArray(node.enum)) {
            return ctx.report({
              message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('array'),
            });
          }
        }
        return errors;
      },
      type(node, ctx) {
        if (node.type && node.type && typeof node.type !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        if (node.type && !['string', 'object', 'array', 'integer', 'number', 'boolean', 'file'].includes(node.type)) {
          const possibleAlternate = getClosestString(
            node.type, ['string', 'object', 'array', 'integer', 'number', 'boolean'],
          );
          ctx.report({
            message: 'Object type can be one of following only: "string", "object", "array", "integer", "number", "boolean".',
            possibleAlternate,
          });
        }
        return null;
      },
      items(node, ctx) {
        if (node && node.items && Array.isArray(node.items)) {
          ctx.report({
            message: 'Value of items must not be an array. It must be a Schema object',
          });
        }
      },
      additionalProperties: (node, ctx) => {
        if (node
          && node.additionalProperties
          && (['boolean', 'object'].indexOf(typeof node.additionalProperties) === -1)) {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean or OAS2 Schema'),
          });
        }
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      format(node, ctx) {
        if (node && node.format && typeof node.format !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      readOnly(node, ctx) {
        if (node && node.readOnly && typeof node.readOnly !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      deprecated(node, ctx) {
        if (node && node.deprecated && typeof node.deprecated !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
    };
  }

  OAS2Schema(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2Schema;
