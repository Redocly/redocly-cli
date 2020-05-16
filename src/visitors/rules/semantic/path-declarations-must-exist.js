class PathDeclarationsMustExist {
  static get rule() {
    return 'path-declarations-must-exist';
  }


  OpenAPIPath(node, _, ctx) {
    if (!(ctx.path.length === 0 || ctx.path[ctx.path.length - 1].indexOf('{}') === -1)) {
      ctx.report({
        message: 'Path parameter declarations must be non-empty. {} is invalid.',
        reportOnKey: true,
      });
    }
  }
}

module.exports = PathDeclarationsMustExist;
