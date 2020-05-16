import { isUrl } from '../../../utils';


class ValidateOpenAPILicense {
  static get rule() {
    return 'oas3-schema/license';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (!node || !node.name) {
          return ctx.report({
            message: ctx.messageHelpers.missingRequiredField('name'),
            reportOnKey: true,
          });
        }
        return null;
      },
      url(node, ctx) {
        if (node && node.url && !isUrl(node.url)) {
          return ctx.report({
            message: 'The url field must be a valid URL.',
          });
        }
        return null;
      },
    };
  }

  OpenAPILicense(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOpenAPILicense;
