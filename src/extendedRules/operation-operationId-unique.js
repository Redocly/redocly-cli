/* eslint-disable class-methods-use-this */
import createError from '../error';
import AbstractRule from './utils/AbstractRule';

class OperationIdUnique extends AbstractRule {
  static get ruleName() {
    return 'operationIdUnique';
  }

  get rule() {
    return 'operation-operationId-unique';
  }

  constructor() {
    super();
    this.operationIds = {};
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, definition, ctx) => {
        if (node.operationId) {
          if (this.operationIds[node.operationId]) {
            this.operationIds[node.operationId] += 1;
            return [createError('The "operationId" fields must be unique', node, ctx, { target: 'value', severity: this.config.level, fromRule: this.rule })];
          }
          this.operationIds[node.operationId] = 1;
        }
        return null;
      },
    };
  }
}

module.exports = OperationIdUnique;
