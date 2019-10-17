/* eslint-disable class-methods-use-this */
import createError from '../../../error';
import AbstractVisitor from '../../utils/AbstractVisitor';

class Operation2xxResponse extends AbstractVisitor {
  static get ruleName() {
    return 'operation2xxResponse';
  }

  get rule() {
    return 'operation-2xx-response';
  }

  constructor(config) {
    super(config);
    this.responseCodes = [];
  }

  OpenAPIOperation() {
    return {
      onExit: (node, definition, ctx) => {
        const errors = [];
        if (!this.responseCodes.find((code) => code[0] === '2')) {
          errors.push(createError('Operation must have at least one 2xx response.', node, ctx, { target: 'key', severity: this.config.level, fromRule: this.rule }));
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
