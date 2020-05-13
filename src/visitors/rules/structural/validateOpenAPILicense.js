import { isUrl } from '../../../utils';


class ValidateOpenAPILicense {
  static get rule() {
    return 'oas3-schema/license';
  }

  get validators() {
    return {
      name(node, ctx) {
        return !node || !node.name ? ctx.createError(ctx.messageHelpers.missingRequiredField('name'), 'key') : null;
      },
      url(node, ctx) {
        return node && node.url && !isUrl(node.url)
          ? ctx.createError('The url field must be a valid URL.', 'value') : null;
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
