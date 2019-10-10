/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../error';
import AbstractRule from './utils/AbstractRule';

class OperationOperationId extends AbstractRule {
  static get ruleName() {
    return 'operationOperationId';
  }

  get rule() {
    return 'operation-operationId';
  }


  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.operationId) {
          return [createErrorMissingRequiredField('operationId', node, ctx, { severity: this.config.level, fromRule: this.rule })];
        }
        return null;
      },
    };
  }
}

module.exports = OperationOperationId;
