/* eslint-disable class-methods-use-this */
import AbstractVisitor from '../../utils/AbstractVisitor';
import createError from '../../../error';

class ServerNotExample extends AbstractVisitor {
  get rule() {
    return 'server-not-example';
  }

  OpenAPIServer() {
    return {
      onEnter: (node, _, ctx) => {
        if (node.url === 'example.com') {
          return [createError('The "server" object should not point to "example.com" domain.', node, ctx, { severity: this.config.level, fromRule: this.rule, target: 'key' })];
        }
        return [];
      },
    };
  }
}

module.exports = ServerNotExample;
