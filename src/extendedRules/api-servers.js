/* eslint-disable class-methods-use-this */
import AbstractRule from './utils/AbstractRule';
import { createErrorMissingRequiredField } from '../error';

class ApiServers extends AbstractRule {
  static get ruleName() {
    return 'apiServers';
  }

  get rule() {
    return 'api-servers';
  }

  OpenAPIRoot() {
    return {
      onEnter: (node, _, ctx) => (
        (node.servers && Array.isArray(node.servers) && node.servers.length > 0)
          ? null
          : [
            createErrorMissingRequiredField('servers', node, ctx, {
              target: 'key', severity: this.config.level, fromRule: this.rule,
            }),
          ]),
    };
  }
}

module.exports = ApiServers;
