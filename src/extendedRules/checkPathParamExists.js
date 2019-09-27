/* eslint-disable class-methods-use-this */
import createError from '../error';

class LicenseRequired {
  static get ruleName() {
    return 'checkPathParamExists';
  }

  OpenAPIParameter() {
    return {
      onEnter(node, definition, ctx) {
        const errors = [];
        if (node.in && node.in === 'path') {
          const visitedNodes = ctx.pathStack.reduce((acc, val) => [...acc, ...(val.path)], []);
          const missingNameInPath = [...ctx.path, ...visitedNodes]
            .filter((pathNode) => typeof pathNode === 'string' && pathNode.indexOf(`{${node.name}}`) !== -1)
            .length === 0
              && (ctx.path.indexOf('components') === -1 || visitedNodes.indexOf('paths') !== -1);
          if (missingNameInPath) {
            ctx.path.push('name');
            errors.push(createError('The "name" field value is not in the current parameter path.', node, ctx));
            ctx.path.pop();
          }
        }
        return errors;
      },
    };
  }
}

module.exports = LicenseRequired;
