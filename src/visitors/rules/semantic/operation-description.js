/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';
import AbstractRule from '../../utils/AbstractRule';

class OperationDescription extends AbstractRule {
  static get ruleName() {
    return 'operation-description';
  }

  get rule() {
    return 'operation-description';
  }


  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.description) {
          return [createErrorMissingRequiredField('description', node, ctx, { severity: this.config.level, fromRule: this.rule })];
        }
        return null;
      },
    };
  }
}

module.exports = OperationDescription;
