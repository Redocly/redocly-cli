/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../error';
import { messageLevels } from '../error/default';
import AbstractRule from './utils/AbstractRule';

class LicenseRequired extends AbstractRule {
  static get ruleName() {
    return 'licenseRequired';
  }

  OpenAPIInfo() {
    return {
      onEnter(node, definition, ctx) {
        if (!node.license) {
          return [createErrorMissingRequiredField('license', node, ctx, messageLevels.WARNING)];
        }
        return null;
      },
    };
  }
}

module.exports = LicenseRequired;
