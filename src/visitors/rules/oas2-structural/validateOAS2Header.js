import { getClosestString } from '../../../utils';

class ValidateOAS2Header {
  static get rule() {
    return 'oas2-schema/header';
  }

  get validators() {
    return {
      type(node, ctx) {
        if (node && !node.type) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('type'), 'key');
        }
        if (node && node.type && typeof node.type !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      format(node, ctx) {
        if (node && node.format && typeof node.format !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      items(node, ctx) {
        if (node && node.type === 'array' && !node.items) {
          return ctx.createError(ctx.messageHelpers.missingRequiredField('items'), 'key');
        }
        return null;
      },
      collectionFormat(node, ctx) {
        if (node && node.collectionFormat && typeof node.collectionFormat !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        if (node.collectionFormat && !['csv', 'ssv', 'tsv', 'pipes', 'multi'].includes(node.collectionFormat)) {
          const possibleAlternate = getClosestString(node.type, ['csv', 'ssv', 'tsv', 'pipes', 'multi']);
          return ctx.createError('The value of "collectionFormat" field can be one of following only: "csv", "ssv", "tsv", "pipes", "multi".', 'value', { possibleAlternate });
        }
        return null;
      },
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      pattern(node, ctx) {
        if (node && node.pattern && typeof node.pattern !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      maximum(node, ctx) {
        if (node && node.maximum && typeof node.maximum !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      minimum(node, ctx) {
        if (node && node.minimum && typeof node.minimum !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      maxLength(node, ctx) {
        if (node && node.maxLength && typeof node.maxLength !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      minLength(node, ctx) {
        if (node && node.minLength && typeof node.minLength !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      maxItems(node, ctx) {
        if (node && node.maxItems && typeof node.maxItems !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      minItems(node, ctx) {
        if (node && node.minItems && typeof node.minItems !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      multipleOf(node, ctx) {
        if (node && node.multipleOf && typeof node.multipleOf !== 'number') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('number'), 'value');
        return null;
      },
      exclusiveMaximum(node, ctx) {
        if (node && node.exclusiveMaximum && typeof node.exclusiveMaximum !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      exclusiveMinimum(node, ctx) {
        if (node && node.exclusiveMinimum && typeof node.exclusiveMinimum !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      uniqueItems(node, ctx) {
        if (node && node.uniqueItems && typeof node.uniqueItems !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
    };
  }

  OAS2Header() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOAS2Header;
