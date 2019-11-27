/* eslint-disable class-methods-use-this */
import createError, { createErrorMissingRequiredField } from '../../../error';

import { isUrl } from '../../../utils';
import AbstractVisitor from '../../utils/AbstractVisitor';

class ValidateOpenAPILicense extends AbstractVisitor {
  static get ruleName() {
    return 'license';
  }

  get validators() {
    return {
      name(node, ctx) {
        return !node || !node.name ? createErrorMissingRequiredField('name', node, ctx, { fromRule: this.rule, severity: this.config.level }) : null;
      },
      url(node, ctx) {
        return node && node.url && !isUrl(node.url) ? createError('The url field must be a valid URL.', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level }) : null;
      },
    };
  }

  OpenAPILicense() {
    return {
      onEnter: (node, definition, ctx) => ctx.validateFields(
        this.config, this.validators, this.rule,
      ),
    };
  }
}

module.exports = ValidateOpenAPILicense;
