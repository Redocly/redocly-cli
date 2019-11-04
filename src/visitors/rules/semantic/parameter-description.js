/* eslint-disable class-methods-use-this */
import AbstractVisitor from '../../utils/AbstractVisitor';
import createError from '../../../error';

class ParameterDescription extends AbstractVisitor {
  get rule() {
    return 'parameter-description';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.description) {
          return [createError('The "Parameter" object should contain "description" field.', node, ctx, { severity: this.config.level, fromRule: this.rule, target: 'key' })];
        }
        return [];
      },
    };
  }
}

module.exports = ParameterDescription;
