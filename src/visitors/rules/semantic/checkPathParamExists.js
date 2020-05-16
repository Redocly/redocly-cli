class CheckPathParamExists {
  static get rule() {
    return 'path-param-exists';
  }

  OpenAPIParameter(node, _definition, ctx) {
    // if not path parameter
    if (node.in && node.in !== 'path') {
      return;
    }

    const fullPath = [
      ...ctx.pathStack.reduce((acc, val) => [...acc, ...(val.path)], []),
      ...ctx.path,
    ];

    // not referenced from path
    if (!fullPath.length || fullPath[0] !== 'paths') {
      return;
    }

    const isNameInPath = fullPath
      .some((pathNode) => typeof pathNode === 'string' && pathNode.indexOf(`{${node.name}}`) !== -1);

    if (!isNameInPath) {
      ctx.path.push('name');
      ctx.report({ message: 'The "name" field value is not in the current path.' });
      ctx.path.pop();
    }
  }
}
module.exports = CheckPathParamExists;
