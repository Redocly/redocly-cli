class CheckPathParamExists {
  static get rule() {
    return 'path-param-exists';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, definition, ctx) => {
        const errors = [];

        const isPathParameter = node.in && node.in === 'path';

        if (isPathParameter) {
          const visitedNodes = ctx.pathStack.reduce((acc, val) => [...acc, ...(val.path)], []);
          const isInPath = visitedNodes.includes('paths');

          if (isInPath) {
            const missingNameInPath = [...ctx.path, ...visitedNodes]
              .filter((pathNode) => typeof pathNode === 'string' && pathNode.indexOf(`{${node.name}}`) !== -1)
              .length === 0;

            if (missingNameInPath) {
              ctx.path.push('name');
              errors.push(ctx.createError('The "name" field value is not in the current parameter path.', 'value'));
              ctx.path.pop();
            }
          }
        }
        return errors;
      },
    };
  }
}
module.exports = CheckPathParamExists;
