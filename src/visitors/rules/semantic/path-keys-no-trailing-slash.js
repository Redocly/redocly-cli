/* eslint-disable class-methods-use-this */
import AbstractVisitor from '../../utils/AbstractVisitor';
import createError from '../../../error';

class PathKeysNoTrailingSlash extends AbstractVisitor {
  static get ruleName() {
    return 'pathKeysNoTrailingSlash';
  }

  get rule() {
    return 'path-keys-no-trailing-slash';
  }

  OpenAPIPath() {
    return {
      onEnter: (node, _, ctx) => {
        const pathLen = ctx.path.length;
        return pathLen === 0 || ctx.path[pathLen - 1][ctx.path[pathLen - 1].length] !== '/'
          ? null
          : [createError(
            'Trailing spaces in path are not recommended.', node, ctx, {
              target: 'key', severity: this.config.level, fromRule: this.rule,
            },
          )];
      },
    };
  }
}

module.exports = PathKeysNoTrailingSlash;
