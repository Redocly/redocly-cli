import { isUrl } from '../../../utils';

class ValidateOpenAPIExternalDocumentation {
  static get rule() {
    return 'oas3-schema/external-docs';
  }

  get validators() {
    return {
      description(node, ctx) {
        if (node && node.description && typeof node.description !== 'string') {
          return ctx.report({
            message: ctx.messageHelpers.fieldTypeMismatchMessageHelper('string'),
          });
        }
        return null;
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

  OpenAPIExternalDocumentation(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPIExternalDocumentation;
