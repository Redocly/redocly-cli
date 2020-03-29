import { isUrl } from '../../../utils';


class ValidateOAS2License {
  static get rule() {
    return 'oas2-schema/license';
  }

  get validators() {
    return {
      name(node, ctx) {
        return !node || !node.name ? ctx.createError(ctx.messageHelpers.missingRequiredField('name'), 'key') : null;
      },
      url(node, ctx) {
        return node && node.url && !isUrl(node.url) ? ctx.createError('The url field must be a valid URL.', 'value') : null;
      },
    };
  }

  OAS2License() {
    return {
      onEnter: (node, definition, ctx) => {
        console.log('aaasdasfakslfjaskfjklasf');
        return ctx.validateFields(
          this.config, this.rule, this.validators,
        );
      },
    };
  }
}

module.exports = ValidateOAS2License;
