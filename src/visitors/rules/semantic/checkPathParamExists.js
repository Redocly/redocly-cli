class CheckPathParamExists {
  static get rule() {
    return 'path-param-exists';
  }

  OpenAPIParameter() {
    return {
      onEnter: (node, _definition, ctx) => {
        // if not path parameter
        if (node.in && node.in !== 'path') {
          return [];
        }

         const fullPath = [
           ...ctx.pathStack.reduce((acc, val) => [...acc, ...(val.path)], []),
           ...ctx.path
        ];

        // not referenced from path
        if (!fullPath.length || fullPath[0] !== 'paths') {
          return [];
        }

        const errors = [];

        const isNameInPath = fullPath
          .some((pathNode) => typeof pathNode === 'string' && pathNode.indexOf(`{${node.name}}`) !== -1);

        if (!isNameInPath) {
          ctx.path.push('name');
          errors.push(ctx.createError('The "name" field value is not in the current path.', 'value'));
          ctx.path.pop();
        }
        return errors;
      },
    };
  }
}
module.exports = CheckPathParamExists;
