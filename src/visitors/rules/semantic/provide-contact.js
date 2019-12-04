/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';
import AbstractVisitor from '../../utils/AbstractVisitor';

class ProvideContact extends AbstractVisitor {
  static get ruleName() {
    return 'provideContact';
  }

  get rule() {
    return 'provide-contact';
  }

  constructor() {
    super();
    this.requiredFields = ['name', 'email'];
    this.contactFields = [];
  }

  OpenAPIInfo() {
    return {
      onExit: (node, _, ctx) => {
        const errors = [];
        if (!node.contact) {
          return [createErrorMissingRequiredField('contact', node, ctx, { severity: this.config.level, fromRule: this.rule })];
        }
        return errors;
      },
    };
  }

  OpenAPIContact() {
    return {
      onEnter: (node, _, ctx) => {
        const errors = [];
        this.requiredFields.forEach((fName) => {
          if (Object.keys(node).indexOf(fName) === -1) {
            errors.push(
              createErrorMissingRequiredField(
                fName, node, ctx, { severity: this.config.level, fromRule: this.rule },
              ),
            );
          }
        });
        return errors;
      },
    };
  }
}

module.exports = ProvideContact;
