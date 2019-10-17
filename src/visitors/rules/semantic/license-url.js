/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';
import AbstractVisitor from '../../utils/AbstractVisitor';

class LicenseURL extends AbstractVisitor {
  static get ruleName() {
    return 'license-url';
  }

  get rule() {
    return 'license-url';
  }


  OpenAPILicense() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.url) {
          return [createErrorMissingRequiredField('url', node, ctx, { severity: this.config.level, fromRule: this.rule })];
        }
        return null;
      },
    };
  }
}

module.exports = LicenseURL;
