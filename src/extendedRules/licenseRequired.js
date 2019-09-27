/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../error';
import { messageLevels } from '../error/default';

class LicenseRequired {
  static get ruleName() {
    return 'licenseRequired';
  }

  onEnter(node, definition, ctx) {
    if (definition.name !== 'OpenAPIInfo') return null;
    if (!node.license) {
      return [createErrorMissingRequiredField('license', node, ctx, messageLevels.WARNING)];
    }
    return null;
  }
}

module.exports = LicenseRequired;
