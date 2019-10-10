/* eslint-disable class-methods-use-this */
import AbstractRule from './utils/AbstractRule';
import { createErrorMissingRequiredField } from '../error';

class OperationTags extends AbstractRule {
  static get ruleName() {
    return 'operationTags';
  }

  get rule() {
    return 'operation-tags';
  }


  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => (node.tags ? null : createErrorMissingRequiredField('tags', node, ctx, { severity: this.config.level, fromRule: this.rule })),
    };
  }
}

module.exports = OperationTags;
