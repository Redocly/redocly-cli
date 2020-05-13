class PathDeclarationsMustExist {
  static get rule() {
    return 'path-declarations-must-exist';
  }


  OpenAPIPath(node, _, ctx) {
    return ctx.path.length === 0 || ctx.path[ctx.path.length - 1].indexOf('{}') === -1
      ? null
      : ctx.createError(
        'Path parameter declarations must be non-empty. {} is invalid.', 'key',
      );
  }
}

module.exports = PathDeclarationsMustExist;
