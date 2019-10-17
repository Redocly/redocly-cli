/* eslint-disable class-methods-use-this */
import { createErrorMissingRequiredField } from '../../../error';
import AbstractVisitor from '../../utils/AbstractVisitor';

class OperationOperationId extends AbstractVisitor {
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
        return [];
      },
    };
  }
}

module.exports = OperationOperationId;
