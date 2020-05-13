import { isUrl } from '../../../utils';

class validateOAS2ExternalDocs {
  static get rule() {
    return 'oas2-schema/external-docs';
  }

  get validators() {
    return {
      description(node, ctx) {
        return node && node.description && typeof node.description !== 'string'
          ? ctx.createError(ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'), 'value') : null;
      },
      url(node, ctx) {
        if (node && !node.url) return ctx.createError(ctx.messageHelpers.missingRequiredField('url'), 'key');
        if (!isUrl(node.url)) return ctx.createError('url must be a valid URL', 'value');
        return null;
      },
    };
  }

  OAS2ExternalDocumentation(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = validateOAS2ExternalDocs;
