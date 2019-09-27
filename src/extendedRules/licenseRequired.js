/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../error';

class LicenseRequired {
  static get ruleName() {
    return 'licenseRequired';
  }

  onExit(node, definition, ctx) {
    if (definition.name !== 'OpenAPIInfo') return null;
    if (!node.license) {
      return [createErrorMissingRequiredField('license', node, ctx)];
    }
    return null;
  }
}

module.exports = LicenseRequired;
