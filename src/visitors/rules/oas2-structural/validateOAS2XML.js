import { isUrl } from '../../../utils';

class ValidateOAS2XML {
  static get rule() {
    return 'oas2-schema/xml';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (node && node.name && typeof node.name !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      namespace(node, ctx) {
        if (node && node.namespace && typeof node.namespace !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        if (node && node.namespace && typeof node.namespace === 'string' && !isUrl(node.namespace)) {
          ctx.report({
            message: 'The value of a"namespace" field should be a valid URL.',
          });
        }
      },
      prefix(node, ctx) {
        if (node && node.prefix && typeof node.prefix !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      attribute(node, ctx) {
        if (node && node.attribute && typeof node.attribute !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
      },
      wrapped(node, ctx) {
        if (node && node.wrapped && typeof node.wrapped !== 'boolean') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
      },
    };
  }

  OAS2XML(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}


module.exports = ValidateOAS2XML;
