import { isUrl } from '../../../utils';

class ValidateOpenAPIExternalDocumentation {
  static get rule() {
    return 'oas3-schema/external-docs';
  }

  get validators() {
    return {
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string' ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      url(node, ctx) {
        if (node && !node.url) return ctx.createError(ctx.messageHelpers.missingRequiredField('url'), 'key');
        if (!isUrl(node.url)) return ctx.createError('url must be a valid URL', 'value');
        return null;
      },
    };
  }

  OpenAPIExternalDocumentation() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.rule, this.validators,
      ),
    };
  }
}

module.exports = ValidateOpenAPIExternalDocumentation;
