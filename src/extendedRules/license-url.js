/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../error';
import AbstractRule from './utils/AbstractRule';

class LicenseURL extends AbstractRule {
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
