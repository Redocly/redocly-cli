/* eslint-disable class-methods-use-this */
import AbstractVisitor from '../../utils/AbstractVisitor';
import createError from '../../../error';

class ModelDescription extends AbstractVisitor {
  get rule() {
    return 'model-description';
  }

  OpenAPIModel() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.description) {
          return [createError('The "model" object should contain "description" field.', node, ctx, { severity: this.config.level, fromRule: this.rule, target: 'key' })];
        }
        return [];
      },
    };
  }
}

module.exports = ModelDescription;
