/* eslint-disable class-methods-use-this */
import createError from '../error';
import AbstractRule from './utils/AbstractRule';

class Operation2xxResponse extends AbstractRule {
  static get ruleName() {
    return 'operation2xxResponse';
  }

  get rule() {
    return 'operation-2xx-response';
  }

  constructor() {
    super();
    this.responseCodes = [];
  }

  OpenAPIOperation() {
    return {
      onExit: (node, definition, ctx) => {
        const errors = [];
        if (!this.responseCodes.find((code) => code[0] === '2')) {
          errors.push(createError('Operation must have at least one 2xx response.', node, ctx, { target: 'value', severity: this.config.level, fromRule: this.rule }));
        }
        this.responseCodes = [];
        return errors;
      },
    };
  }

  OpenAPIResponseMap() {
    return {
      onEnter: (node) => {
        this.responseCodes.push(...Object.keys(node));
      },
    };
  }
}

module.exports = Operation2xxResponse;
