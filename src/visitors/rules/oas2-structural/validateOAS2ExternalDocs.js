import { isUrl } from '../../../utils';

class validateOAS2ExternalDocs {
  static get rule() {
    return 'oas2-schema/external-docs';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
      },
      url(node, ctx) {
        if (node && !node.url) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('url'),
            reportOnKey: true,
          });
        }
        if (!isUrl(node.url)) {
          return ctx.report({
            message: 'url must be a valid URL',
          });
        }
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
