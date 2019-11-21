/* eslint-disable class-methods-use-this */
import AbstractVisitor from '../../utils/AbstractVisitor';
import createError from '../../../error';

class OperationsTagsAlpabetical extends AbstractVisitor {
  get rule() {
    return 'operations-tags-alpabetical';
  }

  OpenAPIOperation() {
    return {
      onEnter: (node, _, ctx) => {
        if (!node.tags) return [];
        if (!Array.isArray(node.tags)) return [];

        const errors = [];
        ctx.path.push('tags');
        for (let i = 0; i < node.tags.length - 1; i++) {
          if (node.tags[i] > node.tags[i + 1]) {
            errors.push(createError('The operations\' tags array should be in alphabetical order', node, ctx, { target: 'key', severity: this.config.level, fromRule: this.rule }));
          }
        }
        ctx.path.pop();
        return errors;
      },
    };
  }
}

module.exports = OperationsTagsAlpabetical;
