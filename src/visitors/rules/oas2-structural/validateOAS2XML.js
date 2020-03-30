import { isUrl } from '../../../utils';

class ValidateOAS2XML {
  static get rule() {
    return 'oas2-schema/xml';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (node && node.name && typeof node.name !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      namespace(node, ctx) {
        if (node && node.namespace && typeof node.namespace !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        if (!isUrl(node.namespace)) return ctx.createError('The value of a"namespace" field should be a valid URL.', 'value');
        return null;
      },
      prefix(node, ctx) {
        if (node && node.prefix && typeof node.prefix !== 'string') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value');
        return null;
      },
      attribute(node, ctx) {
        if (node && node.attribute && typeof node.attribute !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
      wrapped(node, ctx) {
        if (node && node.wrapped && typeof node.wrapped !== 'boolean') return ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'), 'value');
        return null;
      },
    };
  }

  OAS2XML() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}


module.exports = ValidateOAS2XML;
