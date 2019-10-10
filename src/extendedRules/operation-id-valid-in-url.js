/* eslint-disable class-methods-use-this */
import AbstractRule from './utils/AbstractRule';

class OperationDescription extends AbstractRule {
  static get ruleName() {
    return 'operationDescription';
  }

  get rule() {
    return 'operation-description';
  }


  OpenAPIOperation() {
    return {
      onEnter: () => null,
    };
  }
}

module.exports = OperationDescription;
