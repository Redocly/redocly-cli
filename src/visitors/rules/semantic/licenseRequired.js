/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';
import AbstractVisitor from '../../utils/AbstractVisitor';

class LicenseRequired extends AbstractVisitor {
  static get ruleName() {
    return 'license-required';
  }

  get rule() {
    return 'license-required';
  }

  OpenAPIInfo() {
    return {
      onEnter: (node, definition, ctx) => {
        if (!node.license) {
          return [createErrorMissingRequiredField('license', node, ctx, { fromRule: this.rule, target: 'value', severity: this.config.level })];
        }
        return null;
      },
    };
  }
}

module.exports = LicenseRequired;
