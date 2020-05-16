import { getClosestString } from '../../../utils';

class ValidateOAS2Header {
  static get rule() {
    return 'oas2-schema/header';
  }

  get validators() {
    return {
      type(node, ctx) {
        if (node && !node.type) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('type'),
            reportOnKey: true,
          });
        }
        if (node && node.type && typeof node.type !== 'string') {
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
      items(node, ctx) {
        if (node && node.type === 'array' && !node.items) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('items'),
            reportOnKey: true,
          });
        }
      },
      collectionFormat(node, ctx) {
        if (node && node.collectionFormat && typeof node.collectionFormat !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }

        if (node.collectionFormat && !['csv', 'ssv', 'tsv', 'pipes', 'multi'].includes(node.collectionFormat)) {
          const possibleAlternate = getClosestString(node.type, ['csv', 'ssv', 'tsv', 'pipes', 'multi']);
          return ctx.report({
            message: 'The value of "collectionFormat" field can be one of following: "csv", "ssv", "tsv", "pipes", "multi".',
            possibleAlternate,
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
      pattern(node, ctx) {
        if (node && node.pattern && typeof node.pattern !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      maximum(node, ctx) {
        if (node && node.maximum && typeof node.maximum !== 'number') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
      },
      minimum(node, ctx) {
        if (node && node.minimum && typeof node.minimum !== 'number') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
      },
      maxLength(node, ctx) {
        if (node && node.maxLength && typeof node.maxLength !== 'number') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
      },
      minLength(node, ctx) {
        if (node && node.minLength && typeof node.minLength !== 'number') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
      },
      maxItems(node, ctx) {
        if (node && node.maxItems && typeof node.maxItems !== 'number') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
      },
      minItems(node, ctx) {
        if (node && node.minItems && typeof node.minItems !== 'number') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
      },
      multipleOf(node, ctx) {
        if (node && node.multipleOf && typeof node.multipleOf !== 'number') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'),
          });
        }
      },
      exclusiveMaximum(node, ctx) {
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
      },
      exclusiveMinimum(node, ctx) {
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
      },
      uniqueItems(node, ctx) {
        if (node && node.uniqueItems && typeof node.uniqueItems !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
      },
    };
  }

  OAS2Header(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2Header;
