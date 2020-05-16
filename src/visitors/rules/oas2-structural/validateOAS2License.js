import { isUrl } from '../../../utils';


class ValidateOAS2License {
  static get rule() {
    return 'oas2-schema/license';
  }

  get validators() {
    return {
      name(node, ctx) {
        if (!node || !node.name) {
          ctx.report({
            message: ctx.messageHelpers.missingRequiredField('name'),
            reportOnKey: true,
          });
        }
      },
      url(node, ctx) {
        if (node && node.url && !isUrl(node.url)) {
          ctx.report({
            message: 'The url field must be a valid URL.',
          });
        }
      },
    };
  }

  OAS2License(node, definition, ctx) {
    return ctx.validateFields(
      this.config, this.rule, this.validators,
    );
  }
}

module.exports = ValidateOAS2License;
