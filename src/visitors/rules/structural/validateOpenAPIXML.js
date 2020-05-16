import { isUrl } from '../../../utils';

class ValidateOpenAPIXML {
  static get rule() {
    return 'oas3-schema/xml';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (node && node.name && typeof node.name !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      namespace(node, ctx) {
        if (node && node.namespace && typeof node.namespace !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        if (node && node.namespace && !isUrl(node.namespace)) {
          return ctx.report({
            message: 'The value of a"namespace" field should be a valid URL.',
          });
        }
        return null;
      },
      prefix(node, ctx) {
        if (node && node.prefix && typeof node.prefix !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
      },
      attribute(node, ctx) {
        if (node && node.attribute && typeof node.attribute !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
      wrapped(node, ctx) {
        if (node && node.wrapped && typeof node.wrapped !== 'boolean') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('boolean'),
          });
        }
        return null;
      },
    };
  }

  OpenAPIXML(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIXML;
