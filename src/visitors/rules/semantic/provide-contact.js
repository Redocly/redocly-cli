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
    this.contactFields = [];
    this.requiredFields = ['name', 'email'];
  }

  OpenAPIInfo() {
    return {
      onExit: (node, _, ctx) => {
        const errors = [];
        if (!node.contact) {
          return [createErrorMissingRequiredField('contact', node, ctx, { severity: this.config.level, fromRule: this.rule })];
        }
        this.requiredFields.forEach((fName) => {
          if (this.contactFields.indexOf(fName) === -1) {
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

  OpenAPIContact() {
    return {
      onEnter: (node) => {
        this.contactFields.push(...Object.keys(node));
      },
    };
  }
}

module.exports = ProvideContact;
