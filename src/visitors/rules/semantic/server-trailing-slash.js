/* eslint-disable class-methods-use-this */
import AbstractRule from '../../utils/AbstractRule';
import createError from '../../../error';

class ServersNoTrailingSlash extends AbstractRule {
  static get ruleName() {
    return 'servesrNoTrailingSlash';
  }

  get rule() {
    return 'servers-no-trailing-slash';
  }

  OpenAPIServer() {
    return {
      onEnter: (node, _, ctx) => (node.url && node.url === '/'
        ? [createError(
          'Trailing spaces in path are not recommended.', node, ctx, {
            target: 'key', severity: this.config.level, fromRule: this.rule,
          },
        )]
        : null),
    };
  }
}

module.exports = ServersNoTrailingSlash;
